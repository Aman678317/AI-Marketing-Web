import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/integrations?error=not_configured&platform=facebook', req.url));
  }
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || new URL('/api/auth/facebook/callback', req.url).toString();
  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=pages_show_list,pages_manage_posts`;
  return NextResponse.redirect(url);
}
