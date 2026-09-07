import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/prisma';

type DailyAsset = { day: number; assets: { type: string; platforms: string[]; status: string }[] };

function fallbackPlan(brief: string, note: string) {
  return {
    campaign_id: 'demo_' + Date.now(),
    objective: 'Website visits',
    audience: 'Startup founders',
    platforms: ['instagram', 'facebook', 'youtube', 'linkedin'],
    duration_days: 10,
    daily_assets: [] as DailyAsset[],
    brief,
    status: 'planned_fallback',
    note,
  };
}

export async function POST(req: NextRequest) {
  let brief = '';
  try {
    const body = await req.json();
    brief = typeof body?.brief === 'string' ? body.brief : '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!brief.trim()) {
    return NextResponse.json({ error: 'brief is required' }, { status: 400 });
  }

  // 1) Ask the Python worker for a plan (optional service).
  // 127.0.0.1 literal — `localhost` can resolve to ::1 on Windows and miss uvicorn.
  // Timeout must exceed the LLM planning time (provider chain ~15-30s), not 8s.
  const workerUrl = process.env.WORKER_URL || 'http://127.0.0.1:8000';
  const planTimeoutMs = Number(process.env.PLAN_TIMEOUT_MS || 120000);
  let plan;
  try {
    const res = await fetch(`${workerUrl}/agent/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief }),
      signal: AbortSignal.timeout(planTimeoutMs),
    });
    const text = await res.text();
    plan = text ? JSON.parse(text) : null;
    if (!plan || !plan.campaign_id) throw new Error('worker returned no plan');
  } catch {
    plan = fallbackPlan(brief, 'Agent worker unreachable — using fallback plan.');
  }

  // 2) Persist campaign + content (optional — DB may not be migrated yet).
  const saved = await withDb<{ saved: boolean; dbId: string | null; contentCount: number }>(
    async (db) => {
      const campaign = await db.campaign.create({
        data: {
          name: `Campaign ${String(plan.campaign_id).slice(0, 8)}`,
          brief,
          status: 'DRAFT',
          workspaceId: 'ws_demo',
          content: {
            create:
              (plan.daily_assets as DailyAsset[] | undefined)
                ?.slice(0, 3)
                .flatMap((d) =>
                  (d.assets ?? []).map((a) => ({
                    platform: a.platforms?.[0] || 'instagram',
                    caption: `${a.type} for day ${d.day}`,
                    status: 'DRAFT',
                  }))
                ) ?? [],
          },
        },
        include: { content: true },
      });
      return { saved: true, dbId: campaign.id, contentCount: campaign.content.length };
    },
    { saved: false, dbId: null, contentCount: 0 }
  );

  return NextResponse.json({ ...plan, ...saved });
}

export async function GET() {
  const campaigns = await withDb(
    (db) => db.campaign.findMany({ include: { content: true } }),
    [] // DB unavailable — return an empty list instead of a 500.
  );
  return NextResponse.json({ campaigns });
}
