import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/prisma';

// Capabilities per platform, mirroring connectors/* declarations.
const PLATFORM_CAPABILITIES: Record<string, Record<string, boolean>> = {
  meta: { publish_text: true, publish_image: true, publish_video: true, schedule: true, analytics: true },
  facebook: { publish_text: true, publish_image: true, publish_video: true, schedule: true },
  youtube: { publish_video: true, schedule: true, analytics: true },
  linkedin: { publish_text: true, analytics: true },
};

const PLATFORM_NAMES: Record<string, string> = {
  meta: 'Meta / Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
};

/**
 * Sandbox connect: creates a clearly-labeled demo connection so the full
 * campaign -> approve -> queue flow can be exercised before real OAuth
 * developer credentials exist. Demo connections never touch real platforms.
 */
export async function POST(req: NextRequest) {
  let platform = '';
  try {
    const body = await req.json();
    platform = String(body?.platform || '').toLowerCase();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const capabilities = PLATFORM_CAPABILITIES[platform];
  if (!capabilities) {
    return NextResponse.json({ error: `Unknown platform '${platform}'` }, { status: 400 });
  }

  const result = await withDb(
    async (db) => {
      const id = `demo_${platform}`;
      await db.connection.upsert({
        where: { id },
        update: { tokens: { access_token: 'sandbox', sandbox: true }, capabilities },
        create: {
          id,
          platform,
          accountId: `sandbox_${platform}`,
          displayName: `${PLATFORM_NAMES[platform]} (sandbox)`,
          tokens: { access_token: 'sandbox', sandbox: true },
          capabilities,
          workspaceId: 'ws_demo',
        },
      });
      return { ok: true as const };
    },
    null
  );

  if (!result) {
    return NextResponse.json(
      { error: 'Database unavailable. Start Postgres and run migrations.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, platform, sandbox: true });
}

export async function DELETE(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform')?.toLowerCase() || '';
  if (!PLATFORM_CAPABILITIES[platform]) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  }
  const ok = await withDb(
    async (db) => {
      await db.connection.deleteMany({ where: { id: `demo_${platform}` } });
      return true as const;
    },
    null
  );
  return NextResponse.json({ ok: Boolean(ok) });
}
