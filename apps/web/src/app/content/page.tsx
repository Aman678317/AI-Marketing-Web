'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, PlatformChip, EmptyState } from '@/components/ui';

const FLOW = ['DRAFT', 'AI_REVIEW', 'HUMAN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED'];

export default function ContentLibrary() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const contents =
        data.campaigns?.flatMap((c: any) =>
          (c.content ?? []).map((ct: any) => ({ ...ct, campaignName: c.name }))
        ) ?? [];
      setItems(contents);
    } catch (err: any) {
      setError(err?.message || 'Failed to load content.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/content/${id}/approve`, { method: 'POST' });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'APPROVED' } : i)));
    } catch (err: any) {
      setError(err?.message || 'Approval failed.');
    } finally {
      setBusyId(null);
    }
  }

  const counts = FLOW.reduce((acc: Record<string, number>, s) => {
    acc[s] = items.filter((i) => i.status?.toUpperCase() === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Library"
        subtitle="Every asset follows the approval state machine — nothing publishes from DRAFT."
        actions={<Link href="/" className="btn-ghost text-xs">+ New campaign</Link>}
      />

      {/* State machine strip */}
      <div className="card card-pad">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {FLOW.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="badge bg-zinc-100 text-zinc-600">
                {s.replace('_', ' ')} <span className="ml-1 font-mono opacity-60">{counts[s] ?? 0}</span>
              </span>
              {i < FLOW.length - 1 && <span className="text-zinc-300">→</span>}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No content yet"
            body="Generate your first campaign on the Dashboard — drafts will land here for review and approval."
            action={<Link href="/" className="btn-brand px-4 py-1.5 text-xs">Create a campaign</Link>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3">Caption</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-zinc-100 transition-colors hover:bg-zinc-50/60">
                  <td className="px-5 py-3 text-xs font-medium text-zinc-500">{i.campaignName}</td>
                  <td className="px-5 py-3"><PlatformChip platform={i.platform} /></td>
                  <td className="max-w-xs truncate px-5 py-3 text-xs text-zinc-600">{i.caption ?? '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={i.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {i.status === 'DRAFT' ? (
                      <button
                        onClick={() => approve(i.id)}
                        disabled={busyId === i.id}
                        className="btn-brand px-3 py-1.5 text-2xs"
                      >
                        {busyId === i.id ? 'Approving…' : 'Approve'}
                      </button>
                    ) : (
                      <span className="text-2xs text-zinc-400">
                        {i.approvedAt ? `by ${i.approvedBy ?? 'user'}` : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
