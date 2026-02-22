import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { leadsRouter } from './routes/leads';
import { messagesRouter } from './routes/messages';
import { webhookRouter } from './routes/webhook';
import { errorHandler } from './middleware/errorHandler';
import { startWorker } from './workers/inboundWorker';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['http://localhost:3000', 'http://crm-frontend:3000']
        : '*',
    credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
app.use('/leads', leadsRouter);
app.use('/webhooks', webhookRouter);
app.use('/leads', messagesRouter);

// Error handler
app.use(errorHandler);

// Start server and worker
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    startWorker();
    console.log(`⚡ BullMQ worker started`);
});

export default app;
