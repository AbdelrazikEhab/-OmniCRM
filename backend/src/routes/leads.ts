import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

export const leadsRouter = Router();

// All leads routes require authentication
leadsRouter.use(authenticate);

const createLeadSchema = z.object({
    phone: z.string().min(1).regex(/^\+?[0-9]+$/, 'Invalid phone number format'),
    name: z.string().optional(),
});

const assignLeadSchema = z.object({
    assignedToUserId: z.string().uuid(),
});

// GET /leads/agents/list - Get agents for assignment (Admin only)
// IMPORTANT: Must be defined before /:id to avoid path capture
leadsRouter.get('/agents/list', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const tenantId = req.user!.tenantId;

        const agents = await prisma.user.findMany({
            where: {
                tenantId,
                role: 'AGENT',
            },
            select: {
                id: true,
                email: true,
                role: true,
                _count: {
                    select: { assignedLeads: true },
                },
            },
        });

        res.json(agents);
    } catch (error) {
        console.error('List agents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /leads - Create lead (Admin only)
leadsRouter.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const body = createLeadSchema.parse(req.body);
        const tenantId = req.user!.tenantId;

        // Check if lead with same phone already exists in this tenant
        const existing = await prisma.lead.findUnique({
            where: {
                tenantId_phone: {
                    tenantId,
                    phone: body.phone,
                },
            },
        });

        if (existing) {
            res.status(409).json({ error: 'Lead with this phone already exists in your tenant' });
            return;
        }

        const lead = await prisma.lead.create({
            data: {
                tenantId,
                phone: body.phone,
                name: body.name,
                status: 'NEW',
            },
            include: {
                assignedTo: {
                    select: { id: true, email: true, role: true },
                },
            },
        });

        res.status(201).json(lead);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        console.error('Create lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /leads - List leads
leadsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const tenantId = req.user!.tenantId;
        const { status } = req.query;

        const where: any = { tenantId };

        // RBAC: Agents can only see assigned leads
        if (req.user!.role === 'AGENT') {
            where.assignedToUserId = req.user!.userId;
        }

        // Optional status filter
        if (status && ['NEW', 'IN_PROGRESS', 'CLOSED'].includes(status as string)) {
            where.status = status as string;
        }

        const leads = await prisma.lead.findMany({
            where,
            include: {
                assignedTo: {
                    select: { id: true, email: true, role: true },
                },
                _count: {
                    select: { messages: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        res.json(leads);
    } catch (error) {
        console.error('List leads error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /leads/:id - Get single lead
leadsRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const tenantId = req.user!.tenantId;
        const leadId = req.params.id;

        const lead = await prisma.lead.findFirst({
            where: {
                id: leadId,
                tenantId, // Tenant isolation
            },
            include: {
                assignedTo: {
                    select: { id: true, email: true, role: true },
                },
            },
        });

        if (!lead) {
            res.status(404).json({ error: 'Lead not found' });
            return;
        }

        // RBAC: Agents can only see assigned leads
        if (req.user!.role === 'AGENT' && lead.assignedToUserId !== req.user!.userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        res.json(lead);
    } catch (error) {
        console.error('Get lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /leads/:id/assign - Assign lead (Admin only)
leadsRouter.patch('/:id/assign', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const body = assignLeadSchema.parse(req.body);
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

        // Verify the assignee is an agent in the same tenant
        const agent = await prisma.user.findFirst({
            where: {
                id: body.assignedToUserId,
                tenantId,
                role: 'AGENT',
            },
        });

        if (!agent) {
            res.status(400).json({ error: 'Agent not found in your tenant' });
            return;
        }

        const updated = await prisma.lead.update({
            where: { id: leadId },
            data: {
                assignedToUserId: body.assignedToUserId,
                status: lead.status === 'NEW' ? 'IN_PROGRESS' : lead.status,
            },
            include: {
                assignedTo: {
                    select: { id: true, email: true, role: true },
                },
            },
        });

        res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        console.error('Assign lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
