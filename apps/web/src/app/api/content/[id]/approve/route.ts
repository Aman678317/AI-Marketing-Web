import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/prisma';
import { enqueuePublish } from '@/lib/queue/publisher';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;

  const result = await withDb(
    async (db) => {
      const content = await db.content.update({
        where: { id },
        data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: 'user_demo' },
      });

      const job = {
        idempotencyKey: `publish_${content.id}`,
        contentId: content.id,
        platform: content.platform,
        caption: content.caption,
        mediaUrl: content.mediaUrl,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      // Queue is optional — approval must succeed even if Redis is down.
      let queued = true;
      try {
        await enqueuePublish(job);
        await db.job.create({
          data: {
            contentId: content.id,
            connector: content.platform,
            status: 'QUEUED',
            scheduledAt: job.scheduledAt,
          },
        });
      } catch (err) {
        console.error('[approve] enqueue failed:', err);
        queued = false;
      }

      return { success: true as const, content, job, queued };
    },
    null // DB unavailable or content not found.
  );

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Could not approve content. Is the database migrated (`npx prisma migrate dev`)?' },
      { status: 503 }
    );
  }

  return NextResponse.json(result);
}
