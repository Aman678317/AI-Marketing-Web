import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Fast-fail Redis connection: if Redis is down, enqueuePublish must fail in
 * seconds (the approve route catches it and continues) instead of hanging for
 * minutes on ioredis default retry loops.
 */
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  connectTimeout: 3000,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: (times) => (times > 2 ? null : 200), // stop reconnecting after 2 tries
});

export const publishQueue = new Queue('publish', { connection: redis });

/**
 * Enqueue an approved publish job.
 *  - delay: job runs at scheduledAt (BullMQ delayed job) — no open HTTP waits.
 *  - jobId (idempotency key): publish_<contentId> prevents duplicate publishes.
 *  - attempts/backoff: 3 tries, exponential; failures surface in queue-worker logs.
 */
export async function enqueuePublish(job: {
  idempotencyKey: string;
  contentId: string;
  platform: string;
  caption?: string | null;
  mediaUrl?: string | null;
  scheduledAt?: Date | string | null;
}) {
  const scheduledMs = job.scheduledAt ? new Date(job.scheduledAt).getTime() : Date.now();
  const delay = Math.max(0, scheduledMs - Date.now());

  await publishQueue.add('publish-content', job, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    delay,
    jobId: job.idempotencyKey,
    removeOnComplete: 200,
    removeOnFail: 500,
  });

  return { delay, scheduledAt: new Date(Date.now() + delay).toISOString() };
}
