import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
    userId: string;
    tenantId: string;
    role: 'ADMIN' | 'AGENT';
    email: string;
}

export interface AuthRequest extends Request {
    user?: AuthPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

export function generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export function requireRole(...roles: Array<'ADMIN' | 'AGENT'>) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
}
