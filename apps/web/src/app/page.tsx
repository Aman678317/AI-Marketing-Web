'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatCard, PlatformChip } from '@/components/ui';

const EXAMPLES = [
  'For the next 10 days, promote my website example.com — one short video and one image post per day for Instagram, Facebook, YouTube, and LinkedIn. Professional tone, target startup founders, optimize for website visits.',
  'Create a 7-day LinkedIn campaign for my B2B SaaS launch. Thought-leadership posts, founder voice, morning slots.',
  '30-day Instagram + YouTube campaign for my fitness brand. Reels and shorts, energetic tone, Gen-Z audience.',
];

const STEPS = [
  { n: '1', title: 'Describe the campaign', body: 'One prompt: goal, channels, tone, duration.' },
  { n: '2', title: 'Agent plans it', body: 'Structured multi-day plan with per-platform assets.' },
  { n: '3', title: 'Review & approve', body: 'Nothing publishes without your explicit approval.' },
  { n: '4', title: 'Schedule & track', body: 'Official connectors publish; analytics flow back in.' },
];

export default function Dashboard() {
  const [brief, setBrief] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Server returned a non-JSON response (HTTP ${res.status}).`);
      }
      if (!res.ok) throw new Error(data?.error || `Request failed with HTTP ${res.status}.`);
      if (!data) throw new Error('Server returned an empty response.');

      setPlan(data);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while generating the plan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero + builder */}
      <section className="card overflow-hidden">
        <div className="border-b border-zinc-100 bg-gradient-to-b from-brand-50/60 to-transparent px-6 py-8 sm:px-8">
          <span className="badge bg-brand-100 text-brand-700">One prompt → full campaign</span>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight">
            Turn a single brief into a multi-day, multi-platform content campaign.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            The agent plans content, drafts platform-specific variants, and queues publishing through official
            APIs — with human approval before anything goes live.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-pad space-y-4">
          <div>
            <label htmlFor="brief" className="label">Campaign brief</label>
            <textarea
              id="brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="e.g. Create a 10-day campaign for my website. One short video + one image post per day across Instagram, Facebook, YouTube and LinkedIn. Professional tone, target startup founders."
              className="input min-h-[120px] resize-y leading-relaxed"
              required
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wide text-zinc-400">Try:</span>
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBrief(ex)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-2xs text-zinc-600 transition-colors hover:border-brand-500 hover:text-brand-700"
              >
                {['10-day multi-platform', '7-day B2B LinkedIn', '30-day fitness'][i]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className="btn-brand px-6">
              {loading && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
              )}
              {loading ? 'Planning…' : 'Generate Plan'}
            </button>
            <p className="text-2xs text-zinc-400">Runs locally · falls back gracefully if services are offline</p>
          </div>
        </form>
      </section>

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <div>
            <p className="font-semibold">Could not generate the plan</p>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Plan result */}
      {plan && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-6 py-4">
            <h2 className="text-base font-semibold">Campaign Plan</h2>
            <div className="flex items-center gap-2">
              {plan.note && (
                <span className="badge bg-amber-100 text-amber-700" title={plan.note}>fallback mode</span>
              )}
              <span className={`badge ${plan.saved ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                {plan.saved ? `saved · ${plan.contentCount} items` : 'not saved'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-5 text-sm sm:grid-cols-4">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-zinc-400">Campaign ID</p>
              <p className="mt-0.5 truncate font-mono text-xs">{plan.campaign_id}</p>
            </div>
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-zinc-400">Duration</p>
              <p className="mt-0.5 font-semibold">{plan.duration_days} days</p>
            </div>
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-zinc-400">Objective</p>
              <p className="mt-0.5">{plan.objective}</p>
            </div>
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-zinc-400">Audience</p>
              <p className="mt-0.5">{plan.audience}</p>
            </div>
          </div>

          <div className="px-6 pb-2">
            <p className="text-2xs font-semibold uppercase tracking-wide text-zinc-400">Platforms</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {plan.platforms?.map((p: string) => (
                <span key={p} className="rounded-full border border-zinc-200 bg-white px-3 py-1">
                  <PlatformChip platform={p} />
                </span>
              ))}
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-zinc-400">Daily assets</p>
            <div className="space-y-1.5">
              {(plan.daily_assets ?? []).slice(0, 6).map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 text-xs">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-2xs font-bold shadow-sm ring-1 ring-zinc-200">
                    {d.day}
                  </span>
                  <span className="font-medium capitalize">{d.assets?.map((a: any) => a.type).join(' + ')}</span>
                  <span className="ml-auto text-zinc-400">{d.assets?.[0]?.platforms?.join(' · ')}</span>
                </div>
              ))}
              {(!plan.daily_assets || plan.daily_assets.length === 0) && (
                <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-400">
                  No daily assets in this plan yet.
                </p>
              )}
              {plan.daily_assets?.length > 6 && (
                <p className="pt-1 text-center text-2xs text-zinc-400">+ {plan.daily_assets.length - 6} more days</p>
              )}
            </div>
          </div>

          <details className="border-t border-zinc-100 px-6 py-3">
            <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-ink">Raw JSON</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-zinc-50 p-3 text-2xs leading-relaxed text-zinc-600">
              {JSON.stringify(plan, null, 2)}
            </pre>
          </details>

          <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-6 py-3">
            <p className="text-2xs text-zinc-400">Next: review drafts in the Content Library, then approve to schedule.</p>
            <Link href="/content" className="btn-primary px-4 py-1.5 text-xs">Open Content Library →</Link>
          </div>
        </section>
      )}

      {/* How it works */}
      <section>
        <PageHeader title="How it works" subtitle="The approval-first pipeline from brief to published metrics." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="card card-pad">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-2xs font-bold text-white">{s.n}</span>
              <p className="mt-3 text-sm font-semibold">{s.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Connected channels" value="0" hint="Connect via Integrations" />
        <StatCard label="Publishing safety" value="Approval-gated" hint="Kill switch ready" accent />
        <StatCard label="AI runtime" value="Local-first" hint="Ollama optional · OpenAI optional" />
      </section>
    </div>
  );
}
