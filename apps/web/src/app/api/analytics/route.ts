import { NextResponse } from 'next/server';
import { withDb } from '@/lib/prisma';

export async function GET() {
  const analytics = await withDb(
    (db) => db.analytics.findMany({ orderBy: { collectedAt: 'desc' }, take: 50 }),
    [] // DB unavailable — empty list instead of a 500.
  );
  return NextResponse.json({ analytics });
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Normalize via the analytics service (optional).
  let normalized: any;
  try {
    const res = await fetch(process.env.ANALYTICS_URL || 'http://localhost:8002/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    normalized = text ? JSON.parse(text) : null;
    if (!normalized?.normalized) throw new Error('collector returned no normalized metrics');
  } catch {
    return NextResponse.json(
      { saved: false, error: 'Analytics collector unreachable. Start services/analytics on :8002.' },
      { status: 503 }
    );
  }

  const m = normalized.normalized;
  const saved = await withDb(
    (db) =>
      db.analytics.create({
        data: {
          contentId: body.content_id,
          platform: body.platform,
          impressions: m.impressions ?? 0,
          reach: m.reach ?? 0,
          views: m.views ?? 0,
          likes: m.likes ?? 0,
          comments: m.comments ?? 0,
          shares: m.shares ?? 0,
          clicks: m.clicks ?? 0,
          raw: body.raw,
        },
      }),
    null
  );

  return NextResponse.json({ saved: Boolean(saved) });
}
