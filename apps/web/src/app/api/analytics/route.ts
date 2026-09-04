import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const analytics = await prisma.analytics.findMany({ orderBy: { collectedAt: 'desc' }, take: 50 });
  return NextResponse.json({ analytics });
}

export async function POST(req: Request) {
  const body = await req.json();
  // Normalize via analytics service
  const res = await fetch(process.env.ANALYTICS_URL || 'http://localhost:8002/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const normalized = await res.json();
  // Save normalized
  await prisma.analytics.create({
    data: {
      contentId: body.content_id,
      platform: body.platform,
      impressions: normalized.normalized.impressions,
      reach: normalized.normalized.reach,
      views: normalized.normalized.views,
      likes: normalized.normalized.likes,
      comments: normalized.normalized.comments,
      shares: normalized.normalized.shares,
      clicks: normalized.normalized.clicks,
      raw: body.raw
    }
  });
  return NextResponse.json({ saved: true });
}
