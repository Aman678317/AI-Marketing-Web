import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/?error=auth_failed', req.url));
  await prisma.connection.upsert({
    where: { id: 'linkedin_demo' },
    update: { tokens: { access_token: 'demo' }, capabilities: { publish_text:true } },
    create: { id: 'linkedin_demo', platform: 'linkedin', accountId: 'demo', displayName: 'Demo LinkedIn', tokens: { access_token:'demo' }, capabilities: { publish_text:true }, workspaceId: 'ws_demo' }
  });
  return NextResponse.redirect(new URL('/integrations?connected=linkedin', req.url));
}
