import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/integrations?error=not_configured&platform=linkedin', req.url));
  }
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || new URL('/api/auth/linkedin/callback', req.url).toString();
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=r_liteprofile%20w_member_social`;
  return NextResponse.redirect(url);
}
