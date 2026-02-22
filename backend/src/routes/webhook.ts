import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { inboundQueue } from '../lib/queue';

export const webhookRouter = Router();

const webhookPayloadSchema = z.object({
    tenantId: z.string().uuid('Invalid tenantId format'),
    messageId: z.string().min(1, 'messageId is required'),
    phone: z.string().min(1, 'phone is required').regex(/^\+?[0-9]+$/, 'Invalid phone format'),
    text: z.string().min(1, 'text is required'),
    timestamp: z.number().int().positive('timestamp must be a positive integer'),
});

// POST /webhooks/whatsapp
webhookRouter.post('/whatsapp', async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate payload
        const payload = webhookPayloadSchema.parse(req.body);

        // Verify tenant exists
        const tenant = await prisma.tenant.findUnique({
            where: { id: payload.tenantId },
        });

        if (!tenant) {
            res.status(400).json({ error: 'Invalid tenantId' });
            return;
        }

        // Idempotency check: has this message already been processed?
        const existingEvent = await prisma.inboundEvent.findUnique({
            where: {
                tenantId_messageId: {
                    tenantId: payload.tenantId,
                    messageId: payload.messageId,
                },
            },
        });

        if (existingEvent) {
            // Already processed - return 200 (idempotent)
            res.status(200).json({
                status: 'already_processed',
                message: 'This message has already been processed',
            });
            return;
        }

        // Record the inbound event for idempotency
        await prisma.inboundEvent.create({
            data: {
                tenantId: payload.tenantId,
                messageId: payload.messageId,
            },
        });

        // Enqueue the job for async processing - return 200 immediately
        await inboundQueue.add('inbound_message', {
            tenantId: payload.tenantId,
            messageId: payload.messageId,
            phone: payload.phone,
            text: payload.text,
            timestamp: payload.timestamp,
        }, {
            jobId: `${payload.tenantId}-${payload.messageId}`, // Prevent duplicate jobs
        });

        res.status(200).json({
            status: 'queued',
            message: 'Message queued for processing',
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
