import { Worker, Job } from 'bullmq';
import prisma from '../lib/prisma';

interface InboundMessageJob {
    tenantId: string;
    messageId: string;
    phone: string;
    text: string;
    timestamp: number;
}

function getRedisConnection() {
    const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
    return {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        maxRetriesPerRequest: null,
    };
}

export function startWorker(): void {
    const worker = new Worker(
        'inbound_message',
        async (job: Job<InboundMessageJob>) => {
            const startTime = Date.now();
            const { tenantId, phone, text } = job.data;

            console.log(`[Worker] Processing job ${job.id} - tenantId: ${tenantId}, phone: ${phone}`);

            try {
                // 1. Find or create lead by (tenantId, phone)
                let lead = await prisma.lead.findUnique({
                    where: {
                        tenantId_phone: {
                            tenantId,
                            phone,
                        },
                    },
                });

                if (!lead) {
                    // Create new lead
                    lead = await prisma.lead.create({
                        data: {
                            tenantId,
                            phone,
                            status: 'NEW',
                        },
                    });
                    console.log(`[Worker] Created new lead: ${lead.id}`);
                }

                // 2. Create INBOUND message
                const message = await prisma.message.create({
                    data: {
                        tenantId,
                        leadId: lead.id,
                        direction: 'INBOUND',
                        text,
                    },
                });
                console.log(`[Worker] Created message: ${message.id}`);

                // 3. If lead is unassigned, auto-assign to least-loaded agent
                if (!lead.assignedToUserId) {
                    const leastLoadedAgent = await findLeastLoadedAgent(tenantId);

                    if (leastLoadedAgent) {
                        await prisma.lead.update({
                            where: { id: lead.id },
                            data: {
                                assignedToUserId: leastLoadedAgent.id,
                                status: 'IN_PROGRESS',
                            },
                        });
                        console.log(`[Worker] Auto-assigned lead ${lead.id} to agent ${leastLoadedAgent.email}`);
                    } else {
                        console.log(`[Worker] No agents available for tenant ${tenantId}, lead remains unassigned`);
                    }
                }

                const processingTime = Date.now() - startTime;
                console.log(`[Worker] Job ${job.id} completed in ${processingTime}ms`);

                return { success: true, processingTime };
            } catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`[Worker] Job ${job.id} failed after ${processingTime}ms:`, error);
                throw error;
            }
        },
        {
            connection: getRedisConnection(),
            concurrency: 5,
        }
    );

    worker.on('completed', (job) => {
        console.log(`[Worker] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
        console.error('[Worker] Worker error:', err);
    });
}

/**
 * Find the agent with the fewest assigned leads in a tenant
 */
async function findLeastLoadedAgent(tenantId: string) {
    const agents = await prisma.user.findMany({
        where: {
            tenantId,
            role: 'AGENT',
        },
        include: {
            _count: {
                select: {
                    assignedLeads: {
                        where: {
                            status: { not: 'CLOSED' },
                        },
                    },
                },
            },
        },
    });

    if (agents.length === 0) return null;

    // Sort by number of assigned (non-closed) leads, ascending
    agents.sort((a, b) => a._count.assignedLeads - b._count.assignedLeads);

    return agents[0];
}
