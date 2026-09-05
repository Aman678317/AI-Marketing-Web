'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui';

export default function ModelsPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [principle, setPrinciple] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.text())
      .then((t) => {
        const data = t ? JSON.parse(t) : null;
        if (!data) throw new Error('Empty response');
        setProviders(data.providers ?? []);
        setPrinciple(data.principle ?? '');
      })
      .catch((e) => setError(e?.message || 'Failed to load models.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Models"
        subtitle="Model catalog for the agent runtime — local first, paid APIs optional."
      />

      {principle && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-xs leading-relaxed text-brand-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" strokeLinecap="round" />
          </svg>
          {principle}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      ) : (
        providers.map((p) => (
          <section key={p.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-semibold">{p.name}</h2>
                <span className={`badge ${p.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {p.status}
                </span>
              </div>
              <span className="font-mono text-2xs text-zinc-400">{p.models.length} models</span>
            </div>

            {p.note && <p className="px-6 pt-4 text-xs leading-relaxed text-zinc-500">{p.note}</p>}

            <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {p.models.slice(0, 24).map((m: any) => (
                <div key={m.id} className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-brand-500/50">
                  <p className="break-all font-mono text-xs font-semibold">{m.id}</p>
                  {m.detail && <p className="mt-1 text-2xs text-zinc-400">{m.detail}</p>}
                </div>
              ))}
              {p.models.length === 0 && (
                <p className="col-span-full rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-400">
                  No models available for this provider yet.
                </p>
              )}
              {p.models.length > 24 && (
                <p className="col-span-full text-center text-2xs text-zinc-400">+ {p.models.length - 24} more</p>
              )}
            </div>
          </section>
        ))
      )}

      {/* Setup guide */}
      <section className="card card-pad">
        <p className="text-2xs font-semibold uppercase tracking-wide text-zinc-400">Setup</p>
        <div className="mt-3 space-y-3 text-xs leading-relaxed text-zinc-600">
          <div>
            <p className="font-semibold text-ink">Local (recommended, zero-cost):</p>
            <pre className="mt-1 overflow-auto rounded-lg bg-zinc-50 p-3 text-2xs">ollama pull llama3.1:8b{'\n'}ollama serve  # default port 11434</pre>
          </div>
          <div>
            <p className="font-semibold text-ink">OpenAI (optional adapter):</p>
            <p className="mt-1">
              Add <code className="rounded bg-zinc-100 px-1 font-mono">OPENAI_API_KEY=sk-…</code> to <code className="rounded bg-zinc-100 px-1 font-mono">.env</code>{' '}
              and restart. Model reference:{' '}
              <a
                href="https://developers.openai.com/api/docs/models"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-600"
              >
                developers.openai.com/api/docs/models
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
