'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader, EmptyState } from '@/components/ui';

const CONNECTORS = [
  {
    id: 'meta', name: 'Meta / Instagram', platform: 'meta', path: '/api/auth/meta/start',
    desc: 'Publish photos, reels and stories to connected IG business accounts via the Graph API.',
    color: 'bg-blue-500', caps: ['publish_image', 'publish_video', 'schedule', 'analytics'],
    envKeys: ['META_CLIENT_ID', 'META_CLIENT_SECRET'],
    consoleUrl: 'https://developers.facebook.com/apps',
    consoleName: 'Meta for Developers → Create App',
  },
  {
    id: 'facebook', name: 'Facebook', platform: 'facebook', path: '/api/auth/facebook/start',
    desc: 'Post to authorized Pages and business assets you manage.',
    color: 'bg-blue-600', caps: ['publish_text', 'publish_image', 'schedule'],
    envKeys: ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
    consoleUrl: 'https://developers.facebook.com/apps',
    consoleName: 'Meta for Developers → Create App',
  },
  {
    id: 'youtube', name: 'YouTube', platform: 'youtube', path: '/api/auth/youtube/start',
    desc: 'Upload videos via the official YouTube Data API with quota-aware scheduling.',
    color: 'bg-red-600', caps: ['publish_video', 'schedule', 'analytics'],
    envKeys: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    consoleName: 'Google Cloud Console → OAuth client (Web)',
  },
  {
    id: 'linkedin', name: 'LinkedIn', platform: 'linkedin', path: '/api/auth/linkedin/start',
    desc: 'Share posts and articles with only the scopes approved for the app.',
    color: 'bg-sky-700', caps: ['publish_text', 'analytics'],
    envKeys: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    consoleUrl: 'https://www.linkedin.com/developers/apps',
    consoleName: 'LinkedIn Developers → Create App',
  },
];

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: 'Developer credentials are not set for this platform yet — add them to apps/web/.env.local, or use a sandbox connection below.',
  auth_failed: 'The OAuth provider returned an error. Check the client ID/secret and redirect URI, then try again.',
  db_unavailable: 'Connected, but the database is not reachable — the connection was not saved.',
};

function IntegrationsInner() {
  const [connections, setConnections] = useState<any[]>([]);
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error') || '';
  const errorPlatform = searchParams.get('platform') || '';

  async function load() {
    try {
      const [connRes, statusRes] = await Promise.all([
        fetch('/api/connections').then((r) => r.text()),
        fetch('/api/integrations/status').then((r) => r.json()),
      ]);
      setConnections(connRes ? JSON.parse(connRes) : []);
      const map: Record<string, boolean> = {};
      for (const c of statusRes.connectors ?? []) map[c.platform] = c.configured;
      setStatus(map);
    } catch {
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function connectSandbox(platform: string) {
    setBusy(platform);
    try {
      const res = await fetch('/api/connections/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function disconnectSandbox(platform: string) {
    setBusy(platform);
    try {
      await fetch(`/api/connections/demo?platform=${platform}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusy(null);
    }
  }

  const connectedCount = connections.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle='Official OAuth flows only — a true "connect it" experience. Tokens are encrypted at rest and never exposed.'
        actions={
          <span className={`badge ${connectedCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
            {connectedCount} connected
          </span>
        }
      />

      {errorParam && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            {errorPlatform ? `${CONNECTORS.find((c) => c.platform === errorPlatform)?.name ?? errorPlatform}: ` : ''}
            {ERROR_MESSAGES[errorParam] ?? 'Connection issue.'}
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {CONNECTORS.map((c) => {
            const conn = connections.find((x) => x.platform === c.platform);
            const isConnected = Boolean(conn);
            const isConfigured = status[c.platform];
            const isSandbox = conn?.id?.startsWith('demo_');
            return (
              <div key={c.id} className="card card-pad flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white ${c.color}`}>
                      {c.name[0]}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className={`mt-0.5 flex items-center gap-1.5 text-2xs ${isConnected ? (isSandbox ? 'text-indigo-600' : 'text-emerald-600') : 'text-zinc-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? (isSandbox ? 'bg-indigo-500' : 'bg-emerald-500') : 'bg-zinc-300'}`} />
                        {isConnected
                          ? `${isSandbox ? 'Sandbox' : 'Connected'} · ${conn.displayName}`
                          : isConfigured
                            ? 'Ready to connect'
                            : 'Developer credentials needed'}
                      </p>
                    </div>
                  </div>
                  {isConnected ? (
                    isSandbox ? (
                      <button
                        onClick={() => disconnectSandbox(c.platform)}
                        disabled={busy === c.platform}
                        className="btn-ghost px-3 py-1.5 text-2xs"
                      >
                        {busy === c.platform ? '…' : 'Disconnect'}
                      </button>
                    ) : (
                      <a href={c.path} className="btn-ghost px-3 py-1.5 text-2xs">Reconnect</a>
                    )
                  ) : isConfigured ? (
                    <a href={c.path} className="btn-primary px-3 py-1.5 text-2xs">Connect</a>
                  ) : (
                    <span className="badge bg-amber-100 text-amber-700">Setup required</span>
                  )}
                </div>

                <p className="mt-3 flex-1 text-xs leading-relaxed text-zinc-500">{c.desc}</p>

                <div className="mt-4 border-t border-zinc-100 pt-3">
                  <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-zinc-400">Capabilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.caps.map((cap) => (
                      <span key={cap} className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-2xs text-zinc-600">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {!isConfigured && (
                  <div className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3">
                    <p className="text-2xs font-semibold text-amber-900">To enable real OAuth:</p>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-2xs leading-relaxed text-amber-800">
                      <li>
                        Create credentials at{' '}
                        <a href={c.consoleUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
                          {c.consoleName}
                        </a>
                      </li>
                      <li>
                        Set <code className="rounded bg-white px-1 font-mono">{c.envKeys[0]}</code> and{' '}
                        <code className="rounded bg-white px-1 font-mono">{c.envKeys[1]}</code> in{' '}
                        <code className="rounded bg-white px-1 font-mono">apps/web/.env.local</code>
                      </li>
                      <li>Allow redirect URI <code className="rounded bg-white px-1 font-mono">/api/auth/{c.id}/callback</code></li>
                      <li>Restart the dev server</li>
                    </ol>
                    <button
                      onClick={() => connectSandbox(c.platform)}
                      disabled={busy === c.platform}
                      className="btn-ghost mt-2.5 px-3 py-1.5 text-2xs"
                      title="Creates a local sandbox connection so you can test the flow without real credentials"
                    >
                      {busy === c.platform ? 'Connecting…' : '🔗 Connect sandbox (no real posting)'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="card card-pad">
        <p className="text-2xs font-semibold uppercase tracking-wide text-zinc-400">Security note</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          OAuth 2.0 with state validation · minimum required scopes · tokens encrypted at rest · disconnect and revoke
          anytime. Unofficial scraping is never used. Sandbox connections are labeled and never touch real platforms.
        </p>
      </div>
    </div>
  );
}

export default function Integrations() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-400">Loading integrations…</div>}>
      <IntegrationsInner />
    </Suspense>
  );
}
