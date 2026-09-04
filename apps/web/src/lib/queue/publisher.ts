import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
export const publishQueue = new Queue('publish', { connection: redis });

export async function enqueuePublish(job: any) {
  await publishQueue.add('publish-content', job, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    jobId: job.idempotencyKey
  });
}
