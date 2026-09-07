import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function allowlisted(url: string, label: string): URL | null {
  try {
    const parsed = new URL(url);
    const allowed = new Set(['127.0.0.1', 'localhost', 'worker', 'media-pipeline', 'host.docker.internal']);
    if (['http:', 'https:'].includes(parsed.protocol) && allowed.has(parsed.hostname)) return parsed;
  } catch {}
  throw new Error(`${label} URL is not allowlisted`);
}

/**
 * Daily auto-generation: research the topic into a creative brief, then
 * generate one image + one video and attach them to fresh DRAFT rows for
 * approval. Runs on demand and from the scheduled daily automation.
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  // 1) Topic: explicit > last campaign brief > brand niche > default
  const fallback = await withDb(
    async (db) => {
      const last = await db.campaign.findFirst({ orderBy: { createdAt: 'desc' } });
      const brand = await db.brand.findFirst();
      return { lastBrief: last?.brief ?? null, niche: brand?.niche ?? null };
    },
    { lastBrief: null, niche: null }
  );
  const topic: string =
    (typeof body?.topic === 'string' && body.topic.trim()) ||
    fallback.lastBrief ||
    (fallback.niche ? `promote ${fallback.niche} brand` : '') ||
    'grow our brand with daily storytelling';

  const workerBase = allowlisted(process.env.WORKER_URL || 'http://127.0.0.1:8000', 'WORKER_URL');
  const mediaBase = allowlisted(process.env.MEDIA_PIPELINE_URL || 'http://127.0.0.1:8001', 'MEDIA_PIPELINE_URL');
  if (!workerBase || !mediaBase) {
    return NextResponse.json({ error: 'Service URLs are not allowlisted' }, { status: 500 });
  }

  // 2) Deep research the topic into a creative brief (LLM chain + fallback)
  let brief: any;
  try {
    const res = await fetch(`${workerBase.origin}/media/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
      signal: AbortSignal.timeout(120000),
    });
    const text = await res.text();
    brief = text ? JSON.parse(text) : null;
    if (!brief?.palette) throw new Error(brief?.error || 'no brief');
  } catch (err: any) {
    return NextResponse.json({ error: `Research failed: ${err?.message}` }, { status: 503 });
  }

  // 3) Create today's campaign + image/video rows
  const today = new Date().toISOString().slice(0, 10);
  const created = await withDb(
    async (db) => {
      const campaign = await db.campaign.create({
        data: {
          name: `Daily ${today}`,
          brief: `${topic} — style: ${brief.visual_style}; mood: ${brief.mood}`,
          status: 'DRAFT',
          workspaceId: 'ws_demo',
          content: {
            create: [
              { platform: 'instagram', caption: `${brief.subject_action} — ${topic}`, status: 'DRAFT' },
              { platform: 'youtube', caption: `video: ${brief.scenes?.[0]?.shot ?? topic}`, status: 'DRAFT' },
            ],
          },
        },
        include: { content: true },
      });
      return campaign;
    },
    null
  );
  if (!created) {
    return NextResponse.json({ error: 'Database unavailable — cannot create daily campaign' }, { status: 503 });
  }

  // 4) Generate image + video from the researched brief
  const jobs = [
    { row: created.content[0], type: 'image', prompt: `${brief.subject_action}. ${topic}` },
    { row: created.content[1], type: 'video', prompt: brief.scenes?.[0]?.shot ?? topic },
  ];
  const results: any[] = [];
  for (const j of jobs) {
    if (!j.row) continue;
    try {
      const res = await fetch(`${mediaBase.origin}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: j.type,
          prompt: j.prompt,
          title: `Daily ${today}`,
          platform: j.row.platform,
          contentId: j.row.id,
          brief,
        }),
        signal: AbortSignal.timeout(240000),
      });
      const text = await res.text();
      const media = text ? JSON.parse(text) : null;
      if (!res.ok || !media?.ok) throw new Error(media?.error || `pipeline HTTP ${res.status}`);
      await withDb((db) => db.content.update({ where: { id: j.row.id }, data: { mediaUrl: media.url } }), null);
      results.push({ contentId: j.row.id, type: j.type, url: media.url, size_bytes: media.size_bytes, generator: media.meta?.generator });
    } catch (err: any) {
      results.push({ contentId: j.row.id, type: j.type, error: err?.message?.slice(0, 160) });
    }
  }

  return NextResponse.json({
    ok: true,
    campaign: { id: created.id, name: created.name },
    topic,
    research: {
      generated_by: brief.generated_by,
      visual_style: brief.visual_style,
      palette: brief.palette,
      mood: brief.mood,
      subject_action: brief.subject_action,
      scenes: brief.scenes?.map((s: any) => s.shot),
    },
    media: results,
    note: 'Rows are DRAFT — approve them in the Content Library with an upload time.',
  });
}

export async function GET() {
  const info = await withDb(
    async (db) => {
      const daily = await db.campaign.findFirst({
        where: { name: { startsWith: 'Daily ' } },
        orderBy: { createdAt: 'desc' },
        include: { content: true },
      });
      return daily;
    },
    null
  );
  return NextResponse.json({ last: info });
}
