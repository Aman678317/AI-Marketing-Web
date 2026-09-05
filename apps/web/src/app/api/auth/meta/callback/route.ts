import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=auth_failed', req.url));
  }

  // TODO: Exchange code for access token with Meta Graph API
  // const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?...`)
  // const tokens = await tokenRes.json()

  // Placeholder tokens
  const tokens = {
    access_token: 'demo_access_token',
    refresh_token: null,
    expires_in: 5184000
  };

  const capabilities = {
    publish_text: true,
    publish_image: true,
    publish_video: true,
    schedule: true,
    analytics: true
  };

  // Save connection (DB optional — redirect succeeds even if persistence fails).
  const saved = await withDb(
    (db) =>
      db.connection.upsert({
        where: { id: 'meta_demo' },
        update: { tokens, capabilities },
        create: {
          id: 'meta_demo',
          platform: 'meta',
          accountId: 'demo_account_123',
          displayName: 'Demo Page',
          tokens,
          capabilities,
          workspaceId: 'ws_demo'
        }
      }),
    null
  );

  const suffix = saved ? 'connected=meta' : 'error=db_unavailable';
  return NextResponse.redirect(new URL(`/integrations?${suffix}`, req.url));
}
