'use client';
import { useEffect, useState } from 'react';
import { PageHeader, EmptyState } from '@/components/ui';

const CONNECTORS = [
  {
    id: 'meta', name: 'Meta / Instagram', platform: 'meta', path: '/api/auth/meta/start',
    desc: 'Publish photos, reels and stories to connected IG business accounts via the Graph API.',
    color: 'bg-blue-500', caps: ['publish_image', 'publish_video', 'schedule', 'analytics'],
  },
  {
    id: 'facebook', name: 'Facebook', platform: 'facebook', path: '/api/auth/facebook/start',
    desc: 'Post to authorized Pages and business assets you manage.',
    color: 'bg-blue-600', caps: ['publish_text', 'publish_image', 'schedule'],
  },
  {
    id: 'youtube', name: 'YouTube', platform: 'youtube', path: '/api/auth/youtube/start',
    desc: 'Upload videos via the official YouTube Data API with quota-aware scheduling.',
    color: 'bg-red-600', caps: ['publish_video', 'schedule', 'analytics'],
  },
  {
    id: 'linkedin', name: 'LinkedIn', platform: 'linkedin', path: '/api/auth/linkedin/start',
    desc: 'Share posts and articles with only the scopes approved for the app.',
    color: 'bg-sky-700', caps: ['publish_text', 'analytics'],
  },
];

export default function Integrations() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/connections')
      .then((r) => r.text())
      .then((t) => setConnections(t ? JSON.parse(t) : []))
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, []);

  const connected = connections.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle='Official OAuth flows only — a true "connect it" experience. Tokens are encrypted at rest and never exposed.'
        actions={
          <span className={`badge ${connected > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
            {connected} connected
          </span>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {CONNECTORS.map((c) => {
            const conn = connections.find((x) => x.platform === c.platform);
            const isConnected = Boolean(conn);
            return (
              <div key={c.id} className="card card-pad flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white ${c.color}`}>
                      {c.name[0]}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className={`mt-0.5 flex items-center gap-1.5 text-2xs ${isConnected ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                        {isConnected ? `Connected · ${conn.displayName}` : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <a href={c.path} className={isConnected ? 'btn-ghost px-3 py-1.5 text-2xs' : 'btn-primary px-3 py-1.5 text-2xs'}>
                    {isConnected ? 'Reconnect' : 'Connect'}
                  </a>
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
              </div>
            );
          })}
        </div>
      )}

      <div className="card card-pad">
        <p className="text-2xs font-semibold uppercase tracking-wide text-zinc-400">Security note</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          OAuth 2.0 with state validation · minimum required scopes · tokens encrypted at rest · disconnect and revoke
          anytime. Unofficial scraping is never used.
        </p>
      </div>
    </div>
  );
}
