'use client';
import { useEffect, useState } from 'react';
import { PageHeader, StatCard, PlatformChip, EmptyState } from '@/components/ui';

export default function Analytics() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.text())
      .then((t) => setData(t ? JSON.parse(t).analytics ?? [] : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const totals = data.reduce(
    (acc: any, a) => ({
      impressions: acc.impressions + (a.impressions || 0),
      reach: acc.reach + (a.reach || 0),
      likes: acc.likes + (a.likes || 0),
      clicks: acc.clicks + (a.clicks || 0),
    }),
    { impressions: 0, reach: 0, likes: 0, clicks: 0 }
  );

  const byPlatform = data.reduce((acc: Record<string, number>, a) => {
    acc[a.platform] = (acc[a.platform] || 0) + (a.impressions || 0);
    return acc;
  }, {});
  const maxPlatform = Math.max(1, ...Object.values(byPlatform));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Normalized metrics collected from each platform's official API — raw payloads preserved."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Impressions" value={totals.impressions.toLocaleString()} />
        <StatCard label="Reach" value={totals.reach.toLocaleString()} />
        <StatCard label="Likes" value={totals.likes.toLocaleString()} />
        <StatCard label="Clicks" value={totals.clicks.toLocaleString()} accent />
      </div>

      {/* Simple per-platform impressions bar chart */}
      {Object.keys(byPlatform).length > 0 && (
        <div className="card card-pad">
          <p className="mb-4 text-2xs font-semibold uppercase tracking-wide text-zinc-400">Impressions by platform</p>
          <div className="space-y-3">
            {Object.entries(byPlatform).map(([platform, value]) => (
              <div key={platform} className="flex items-center gap-3">
                <span className="w-24"><PlatformChip platform={platform} /></span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${(Number(value) / maxPlatform) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right font-mono text-2xs text-zinc-500">{Number(value).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title="No analytics yet"
            body="Metrics appear here after content is published and the collector service (services/analytics, port 8002) gathers platform data."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-5 py-3">Content</th>
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3 text-right">Impressions</th>
                <th className="px-5 py-3 text-right">Reach</th>
                <th className="px-5 py-3 text-right">Likes</th>
                <th className="px-5 py-3 text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a: any) => (
                <tr key={a.id} className="border-t border-zinc-100 hover:bg-zinc-50/60">
                  <td className="px-5 py-3 font-mono text-2xs text-zinc-500">{a.contentId}</td>
                  <td className="px-5 py-3"><PlatformChip platform={a.platform} /></td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{a.impressions?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{a.reach?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{a.likes?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{a.clicks?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
