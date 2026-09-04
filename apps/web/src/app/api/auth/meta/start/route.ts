import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const state = crypto.randomBytes(16).toString('hex');
  const clientId = process.env.META_CLIENT_ID || 'demo_client_id';
  const redirectUri = process.env.META_REDIRECT_URI || 'http://localhost:3000/api/auth/meta/callback';
  const scopes = 'pages_show_list,pages_manage_posts';
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;
  // In real app store state in session
  return NextResponse.redirect(authUrl);
}
