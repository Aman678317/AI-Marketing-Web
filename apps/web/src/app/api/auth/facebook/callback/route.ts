import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/?error=auth_failed', req.url));

  const saved = await withDb(
    (db) =>
      db.connection.upsert({
        where: { id: 'facebook_demo' },
        update: { tokens: { access_token: 'demo' }, capabilities: { publish_text: true } },
        create: {
          id: 'facebook_demo',
          platform: 'facebook',
          accountId: 'demo',
          displayName: 'Demo FB',
          tokens: { access_token: 'demo' },
          capabilities: { publish_text: true },
          workspaceId: 'ws_demo'
        }
      }),
    null
  );

  const suffix = saved ? 'connected=facebook' : 'error=db_unavailable';
  return NextResponse.redirect(new URL(`/integrations?${suffix}`, req.url));
}
