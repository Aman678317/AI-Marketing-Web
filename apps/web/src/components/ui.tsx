import { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-600',
  AI_REVIEW: 'bg-sky-100 text-sky-700',
  HUMAN_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  PUBLISHING: 'bg-violet-100 text-violet-700',
  PUBLISHED: 'bg-brand-100 text-brand-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-zinc-200 text-zinc-500',
  RETRY: 'bg-orange-100 text-orange-700',
  PENDING: 'bg-zinc-100 text-zinc-600',
  QUEUED: 'bg-indigo-100 text-indigo-700',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status?.toUpperCase()] ?? 'bg-zinc-100 text-zinc-600';
  return <span className={`badge ${style}`}>{status?.replace('_', ' ') ?? '—'}</span>;
}

const PLATFORM_DOT: Record<string, string> = {
  instagram: 'bg-pink-500',
  facebook: 'bg-blue-600',
  youtube: 'bg-red-600',
  linkedin: 'bg-sky-700',
  x: 'bg-ink',
  meta: 'bg-blue-500',
};

export function PlatformChip({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-zinc-700">
      <span className={`h-2 w-2 rounded-full ${PLATFORM_DOT[platform?.toLowerCase()] ?? 'bg-zinc-400'}`} />
      {platform}
    </span>
  );
}

export function StatCard({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className="card card-pad">
      <p className="text-2xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold ${accent ? 'text-brand-600' : ''}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card card-pad flex flex-col items-center justify-center py-14 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-zinc-400" aria-hidden>
          <path d="M4 7h16v13H4zM8 7V4h8v3M9 12h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-zinc-500">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
