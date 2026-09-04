import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const worker = new Worker('publish', async job => {
  const { contentId, platform, caption } = job.data;
  // Simulate publish via connector
  console.log(`Publishing ${contentId} to ${platform}: ${caption}`);
  // Here call connector.publish_text
  return { published: true, platform };
}, { connection });

worker.on('completed', job => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed`, err));
