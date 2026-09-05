'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const NAV = [
  { section: 'Workspace', items: [
    { href: '/', label: 'Dashboard', icon: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H10v7H5a1 1 0 0 1-1-1z' },
    { href: '/content', label: 'Content Library', icon: 'M4 5h16v4H4zM4 11h16v8H4z' },
    { href: '/calendar', label: 'Calendar', icon: 'M4 6h16v14H4zM8 3v4M16 3v4M4 10h16' },
  ]},
  { section: 'Growth', items: [
    { href: '/analytics', label: 'Analytics', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { href: '/models', label: 'AI Models', icon: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5' },
  ]},
  { section: 'Connections', items: [
    { href: '/integrations', label: 'Integrations', icon: 'M9 7V3M15 7V3M7 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM9 13h6' },
  ]},
];

function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
      <path d={path} />
    </svg>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-zinc-200 px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 2 3 7v10l9 5 9-5V7zm0 3.3 5.5 3.1v6.2L12 17.7l-5.5-3.1V8.4z" />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Marketing Agent</p>
            <p className="text-2xs text-zinc-400">Local-first control center</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="mb-1.5 px-2 text-2xs font-semibold uppercase tracking-wider text-zinc-400">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          active
                            ? 'bg-zinc-100 font-semibold text-ink'
                            : 'text-zinc-600 hover:bg-zinc-50 hover:text-ink'
                        }`}
                      >
                        <NavIcon path={item.icon} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-200 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-2xs font-bold text-brand-700">
              AM
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold">Aman</p>
              <p className="text-2xs text-zinc-400">Owner · Demo Workspace</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
        <p className="text-sm font-semibold">Marketing Agent</p>
        <nav className="flex gap-1">
          {NAV.flatMap((g) => g.items).map((item) => (
            <Link key={item.href} href={item.href}
              className={`rounded-lg px-2 py-1.5 text-xs ${pathname === item.href ? 'bg-zinc-100 font-semibold' : 'text-zinc-500'}`}>
              {item.label.split(' ')[0]}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main */}
      <main className="min-w-0 flex-1 px-5 pb-12 pt-20 lg:pl-64 lg:pr-8 lg:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
