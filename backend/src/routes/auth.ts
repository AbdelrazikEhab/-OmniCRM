import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    tenantId: z.string().uuid().optional(),
});

// POST /auth/login
authRouter.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const body = loginSchema.parse(req.body);

        // Find user by email (may need tenantId if email is not globally unique)
        const whereClause: any = { email: body.email };

        // If tenantId provided, scope to that tenant
        if (body.tenantId) {
            const user = await prisma.user.findUnique({
                where: {
                    tenantId_email: {
                        tenantId: body.tenantId,
                        email: body.email,
                    },
                },
                include: { tenant: true },
            });

            if (!user) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            const passwordValid = await bcrypt.compare(body.password, user.passwordHash);
            if (!passwordValid) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            const token = generateToken({
                userId: user.id,
                tenantId: user.tenantId,
                role: user.role,
                email: user.email,
            });

            res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    tenantId: user.tenantId,
                    tenantName: user.tenant.name,
                },
            });
            return;
        }

        // Without tenantId, find any user with that email
        const users = await prisma.user.findMany({
            where: { email: body.email },
            include: { tenant: true },
        });

        if (users.length === 0) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Try to match password against found users  
        for (const user of users) {
            const passwordValid = await bcrypt.compare(body.password, user.passwordHash);
            if (passwordValid) {
                const token = generateToken({
                    userId: user.id,
                    tenantId: user.tenantId,
                    role: user.role,
                    email: user.email,
                });

                res.json({
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        tenantId: user.tenantId,
                        tenantName: user.tenant.name,
                    },
                });
                return;
            }
        }

        res.status(401).json({ error: 'Invalid credentials' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /auth/me
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            include: { tenant: true },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Verify tenant matches token claim (additional safety)
        if (user.tenantId !== req.user!.tenantId) {
            res.status(403).json({ error: 'Tenant mismatch' });
            return;
        }

        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            tenantName: user.tenant.name,
        });
    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
