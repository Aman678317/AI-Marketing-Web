import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/?error=auth_failed', req.url));
  await prisma.connection.upsert({
    where: { id: 'youtube_demo' },
    update: { tokens: { access_token: 'demo' }, capabilities: { publish_video:true } },
    create: { id: 'youtube_demo', platform: 'youtube', accountId: 'demo', displayName: 'Demo YouTube', tokens: { access_token:'demo' }, capabilities: { publish_video:true }, workspaceId: 'ws_demo' }
  });
  return NextResponse.redirect(new URL('/integrations?connected=youtube', req.url));
}
