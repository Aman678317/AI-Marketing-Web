import { NextResponse } from 'next/server';
import crypto from 'crypto';
export async function GET() {
  const state = crypto.randomBytes(16).toString('hex');
  const clientId = process.env.LINKEDIN_CLIENT_ID || 'demo';
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/auth/linkedin/callback';
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=r_liteprofile%20w_member_social`;
  return NextResponse.redirect(url);
}
