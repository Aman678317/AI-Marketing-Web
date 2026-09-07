import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Generate media (image | video) for a content item via the media-pipeline
 * service, then attach the stored artifact URL to the content row.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const type = (body?.type || '').toLowerCase();
  if (!['image', 'video'].includes(type)) {
    return NextResponse.json({ error: "type must be 'image' or 'video'" }, { status: 400 });
  }

  const content = await withDb((db) => db.content.findUnique({ where: { id } }), null);
  if (!content) {
    return NextResponse.json({ error: 'Content not found (DB unavailable?)' }, { status: 404 });
  }

  const base = process.env.MEDIA_PIPELINE_URL || 'http://127.0.0.1:8001';
  // SSRF guard: http(s) only + explicit allowlist of the pipeline host.
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    return NextResponse.json({ error: 'invalid MEDIA_PIPELINE_URL' }, { status: 500 });
  }
  const allowedHosts = new Set(['127.0.0.1', 'localhost', 'media-pipeline', 'host.docker.internal']);
  if (!['http:', 'https:'].includes(parsed.protocol) || !allowedHosts.has(parsed.hostname)) {
    return NextResponse.json({ error: `MEDIA_PIPELINE_URL host not allowlisted: ${parsed.hostname}` }, { status: 500 });
  }

  let media: any;
  try {
    const res = await fetch(`${parsed.origin}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        prompt: content.caption || 'Grow your brand with daily stories',
        title: 'campaign',
        platform: content.platform,
        contentId: content.id,
      }),
      signal: AbortSignal.timeout(Number(process.env.MEDIA_TIMEOUT_MS || 180000)),
    });
    const text = await res.text();
    media = text ? JSON.parse(text) : null;
    if (!res.ok || !media?.ok) throw new Error(media?.error || `pipeline HTTP ${res.status}`);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Media pipeline unreachable or failed: ${err?.message}. Start services/media-pipeline on :8001.` },
      { status: 503 }
    );
  }

  const updated = await withDb(
    (db) => db.content.update({ where: { id }, data: { mediaUrl: media.url } }),
    null
  );
  if (!updated) {
    return NextResponse.json({ error: 'Could not attach media (DB unavailable)' }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    type,
    mediaUrl: media.url,
    size_bytes: media.size_bytes,
    generator: media.meta?.generator,
  });
}
