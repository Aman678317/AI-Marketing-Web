import { NextResponse } from 'next/server';
import crypto from 'crypto';
export async function GET() {
  const state = crypto.randomBytes(16).toString('hex');
  const clientId = process.env.FACEBOOK_CLIENT_ID || 'demo';
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/facebook/callback';
  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=pages_show_list,pages_manage_posts`;
  return NextResponse.redirect(url);
}
