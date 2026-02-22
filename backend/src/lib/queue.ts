import { Queue } from 'bullmq';

export const inboundQueue = new Queue('inbound_message', {
    connection: {
        host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
        port: parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'),
        maxRetriesPerRequest: null,
    },
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    },
});
