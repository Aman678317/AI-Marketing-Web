import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const clientId = process.env.META_CLIENT_ID;
  if (!clientId) {
    // No developer credentials yet — never send users to a failing OAuth page.
    return NextResponse.redirect(new URL('/integrations?error=not_configured&platform=meta', req.url));
  }
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = process.env.META_REDIRECT_URI || new URL('/api/auth/meta/callback', req.url).toString();
  const scopes = 'pages_show_list,pages_manage_posts';
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;
  // In real app store state in session
  return NextResponse.redirect(authUrl);
}
