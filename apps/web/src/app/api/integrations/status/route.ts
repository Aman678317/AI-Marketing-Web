import { NextResponse } from 'next/server';

// Reports which connectors have real developer credentials configured, so the
// Integrations UI can show a setup guide instead of a doomed OAuth redirect.
export async function GET() {
  const configured = (clientId?: string) => Boolean(clientId && clientId !== 'demo' && clientId !== 'demo_client_id');

  return NextResponse.json({
    connectors: [
      { platform: 'meta', envKey: 'META_CLIENT_ID', configured: configured(process.env.META_CLIENT_ID) },
      { platform: 'facebook', envKey: 'FACEBOOK_CLIENT_ID', configured: configured(process.env.FACEBOOK_CLIENT_ID) },
      { platform: 'youtube', envKey: 'YOUTUBE_CLIENT_ID', configured: configured(process.env.YOUTUBE_CLIENT_ID) },
      { platform: 'linkedin', envKey: 'LINKEDIN_CLIENT_ID', configured: configured(process.env.LINKEDIN_CLIENT_ID) },
    ],
  });
}
