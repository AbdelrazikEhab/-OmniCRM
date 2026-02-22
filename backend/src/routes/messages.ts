import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const messagesRouter = Router();

// All messages routes require authentication
messagesRouter.use(authenticate);

const sendMessageSchema = z.object({
    text: z.string().min(1, 'Message text is required'),
});

// GET /leads/:id/messages - Get lead messages
messagesRouter.get('/:id/messages', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const tenantId = req.user!.tenantId;
        const leadId = req.params.id;

        // Verify lead belongs to tenant
        const lead = await prisma.lead.findFirst({
            where: {
                id: leadId,
                tenantId, // Tenant isolation
            },
        });

        if (!lead) {
            res.status(404).json({ error: 'Lead not found' });
            return;
        }

        // RBAC: Agents can only see messages for leads assigned to them
        if (req.user!.role === 'AGENT' && lead.assignedToUserId !== req.user!.userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const messages = await prisma.message.findMany({
            where: {
                leadId,
                tenantId, // Double tenant isolation
            },
            orderBy: { createdAt: 'asc' },
        });

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /leads/:id/messages - Send outbound message
messagesRouter.post('/:id/messages', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const body = sendMessageSchema.parse(req.body);
        const tenantId = req.user!.tenantId;
        const leadId = req.params.id;

        // Verify lead belongs to tenant
        const lead = await prisma.lead.findFirst({
            where: {
                id: leadId,
                tenantId,
            },
        });

        if (!lead) {
            res.status(404).json({ error: 'Lead not found' });
            return;
        }

        // RBAC: Agents can only send to their assigned leads
        if (req.user!.role === 'AGENT' && lead.assignedToUserId !== req.user!.userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const message = await prisma.message.create({
            data: {
                tenantId,
                leadId,
                direction: 'OUTBOUND',
                text: body.text,
            },
        });

        // Update lead status to IN_PROGRESS if NEW
        if (lead.status === 'NEW') {
            await prisma.lead.update({
                where: { id: leadId },
                data: { status: 'IN_PROGRESS' },
            });
        }

        res.status(201).json(message);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
