/**
 * Scheduled publisher — consumes the `publish` BullMQ queue and routes each
 * approved job through the Python worker's /publish connector endpoint at
 * schedule time.
 *
 * Reliability (per master spec §11):
 *  - Delayed jobs: produced with `delay` = scheduledAt - now, so nothing
 *    depends on an HTTP request staying open until publication time.
 *  - Idempotency: producer sets jobId = publish_<contentId>, so re-approvals
 *    cannot create duplicate publishes.
 *  - Retries: attempts/backoff are set on the producer; throwing here lets
 *    BullMQ retry with exponential backoff, and dead-letter via failed events.
 */

const { Worker } = require('bullmq');
const IORedis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8000';
const PUBLISH_TIMEOUT_MS = Number(process.env.PUBLISH_TIMEOUT_MS || 30000);

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
  'publish',
  async (job) => {
    const { contentId, platform, caption, mediaUrl, idempotencyKey } = job.data;

    const res = await fetch(`${WORKER_URL}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId, platform, caption, mediaUrl, idempotencyKey }),
      signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS),
    });

    if (!res.ok) {
      // Non-OK from the connector service → transient, let BullMQ retry.
      throw new Error(`publisher responded HTTP ${res.status}`);
    }

    const result = await res.json();
    if (!result.published) {
      // Permanent rejection (unknown platform etc.) — do not retry.
      throw new Error(`Unrecoverable: ${result.error || 'publish rejected'}`);
    }

    console.log(`[publish] job=${job.id} content=${result.contentId} platform=${result.platform} external_id=${result.external_id}`);
    return result;
  },
  { connection, concurrency: 2 }
);

worker.on('completed', (job) => console.log(`[publish] completed job=${job.id}`));
worker.on('failed', (job, err) =>
  console.error(`[publish] FAILED job=${job?.id} attempt=${job?.attemptsMade}: ${err.message}`)
);
worker.on('error', (err) => console.error(`[publish] worker error: ${err.message}`));

async function shutdown() {
  console.log('[publish] shutting down…');
  await worker.close();
  await connection.quit();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`[publish] queue-worker ready — redis=${REDIS_URL} connector_service=${WORKER_URL}`);
