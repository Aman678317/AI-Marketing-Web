import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/integrations?error=not_configured&platform=youtube', req.url));
  }
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || new URL('/api/auth/youtube/callback', req.url).toString();
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&state=${state}`;
  return NextResponse.redirect(url);
}
