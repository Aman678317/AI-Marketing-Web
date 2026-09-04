import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enqueuePublish } from '@/lib/queue/publisher';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const content = await prisma.content.update({
    where: { id },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: 'user_demo' }
  });

  const job = {
    idempotencyKey: `publish_${content.id}`,
    contentId: content.id,
    platform: content.platform,
    caption: content.caption,
    mediaUrl: content.mediaUrl,
    scheduledAt: new Date(Date.now() + 24*60*60*1000)
  };

  await enqueuePublish(job);
  await prisma.job.create({
    data: {
      contentId: content.id,
      connector: content.platform,
      status: 'QUEUED',
      scheduledAt: job.scheduledAt
    }
  });

  return NextResponse.json({ success: true, content, job });
}
