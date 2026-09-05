'use client';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader, StatusBadge } from '@/components/ui';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/campaigns')
      .then((r) => r.text())
      .then((t) => {
        const data = t ? JSON.parse(t) : null;
        const contents =
          data?.campaigns?.flatMap((c: any) =>
            (c.content ?? []).map((ct: any) => ({ ...ct, campaignName: c.name }))
          ) ?? [];
        setItems(contents);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const grid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const startOffset = (first.getDay() + 6) % 7; // Monday-first
    const cells: (number | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const itemsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const item of items) {
      const dateVal = item.scheduledAt ?? item.approvedAt;
      if (!dateVal) continue;
      const d = new Date(dateVal);
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
        const day = d.getDate();
        (map[day] ??= []).push(item);
      }
    }
    return map;
  }, [items, cursor]);

  const today = new Date();
  const isThisMonth = today.getFullYear() === cursor.year && today.getMonth() === cursor.month;

  function prev() {
    setCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  }
  function next() {
    setCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle="Approved content lands here by scheduled date. Publishing still requires approval."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={prev} className="btn-ghost px-2.5 py-1.5 text-xs" aria-label="Previous month">←</button>
            <span className="min-w-[140px] text-center text-sm font-semibold">
              {MONTHS[cursor.month]} {cursor.year}
            </span>
            <button onClick={next} className="btn-ghost px-2.5 py-1.5 text-xs" aria-label="Next month">→</button>
          </div>
        }
      />

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50/70">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-2xs font-semibold uppercase tracking-wide text-zinc-400">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            const dayItems = day ? itemsByDay[day] ?? [] : [];
            const isToday = isThisMonth && day === today.getDate();
            return (
              <div
                key={i}
                className={`min-h-[92px] border-b border-r border-zinc-100 p-2 last:border-r-0 ${
                  day ? '' : 'bg-zinc-50/50'
                }`}
              >
                {day && (
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-2xs font-semibold ${
                      isToday ? 'bg-ink text-white' : 'text-zinc-500'
                    }`}
                  >
                    {day}
                  </span>
                )}
                <div className="mt-1 space-y-1">
                  {dayItems.slice(0, 2).map((it) => (
                    <div key={it.id} className="truncate rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-2xs leading-tight">
                      <StatusBadge status={it.status} />
                      <p className="mt-0.5 truncate text-zinc-500">{it.caption ?? it.platform}</p>
                    </div>
                  ))}
                  {dayItems.length > 2 && (
                    <p className="text-2xs text-zinc-400">+{dayItems.length - 2} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && <p className="text-center text-xs text-zinc-400">Loading schedule…</p>}
      {!loading && items.length === 0 && (
        <p className="text-center text-xs text-zinc-400">
          Nothing scheduled yet — approve content in the library to queue it for publishing.
        </p>
      )}
    </div>
  );
}
