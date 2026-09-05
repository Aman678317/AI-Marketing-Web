import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/?error=auth_failed', req.url));

  const saved = await withDb(
    (db) =>
      db.connection.upsert({
        where: { id: 'youtube_demo' },
        update: { tokens: { access_token: 'demo' }, capabilities: { publish_video: true } },
        create: {
          id: 'youtube_demo',
          platform: 'youtube',
          accountId: 'demo',
          displayName: 'Demo YouTube',
          tokens: { access_token: 'demo' },
          capabilities: { publish_video: true },
          workspaceId: 'ws_demo'
        }
      }),
    null
  );

  const suffix = saved ? 'connected=youtube' : 'error=db_unavailable';
  return NextResponse.redirect(new URL(`/integrations?${suffix}`, req.url));
}
