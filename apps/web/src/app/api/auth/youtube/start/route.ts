import { NextResponse } from 'next/server';
import crypto from 'crypto';
export async function GET() {
  const state = crypto.randomBytes(16).toString('hex');
  const clientId = process.env.YOUTUBE_CLIENT_ID || 'demo';
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/auth/youtube/callback';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&state=${state}`;
  return NextResponse.redirect(url);
}
