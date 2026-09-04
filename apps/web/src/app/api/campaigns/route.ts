import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brief } = body;

  const workerUrl = process.env.WORKER_URL || 'http://localhost:8000';
  let plan;
  try {
    const res = await fetch(`${workerUrl}/agent/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief })
    });
    plan = await res.json();
  } catch {
    plan = {
      campaign_id: 'demo_' + Date.now(),
      objective: 'Website visits',
      audience: 'Startup founders',
      platforms: ['instagram','facebook','youtube','linkedin'],
      duration_days: 10,
      daily_assets: [],
      status: 'planned_fallback'
    };
  }

  // Save campaign + content
  const workspaceId = 'ws_demo';
  const campaign = await prisma.campaign.create({
    data: {
      name: `Campaign ${plan.campaign_id.slice(0,8)}`,
      brief,
      status: 'DRAFT',
      workspaceId,
      content: {
        create: plan.daily_assets?.slice(0,3).flatMap((d:any) => 
          d.assets?.map((a:any) => ({
            platform: a.platforms?.[0] || 'instagram',
            caption: `${a.type} for day ${d.day}`,
            status: 'DRAFT',
          })) || []
        ) || []
      }
    },
    include: { content: true }
  });

  return NextResponse.json({ ...plan, saved: true, dbId: campaign.id, contentCount: campaign.content.length });
}

export async function GET() {
  const campaigns = await prisma.campaign.findMany({ include: { content: true } });
  return NextResponse.json({ campaigns });
}
