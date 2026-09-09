"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/store/hooks";

const NAV = [
  { href: "/", label: "Accueil", icon: HomeIcon },
  { href: "/routine", label: "Séance", icon: PlayIcon },
  { href: "/exercises", label: "Exercices", icon: ListIcon },
  { href: "/progression", label: "Progrès", icon: ChartIcon },
  { href: "/tools", label: "Outils", icon: ToolsIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const onboarded = useAppStore((s) => s.profile.onboarded);
  const immersive = pathname.startsWith("/routine/play") || pathname.startsWith("/onboarding");

  useEffect(() => {
    if (hydrated && !onboarded && !pathname.startsWith("/onboarding")) router.replace("/onboarding");
  }, [hydrated, onboarded, pathname, router]);

  if (immersive) {
    return <main className="flex-1 flex flex-col">{children}</main>;
  }

  return (
    <div className="flex-1 flex md:flex-row">
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-border bg-bg-elevated/80 backdrop-blur sticky top-0 h-screen">
        <div className="px-5 py-6">
          <Link href="/" className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="text-sm font-semibold leading-tight">Vocal Training</div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Tenor</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-accent-soft text-accent-strong" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-5">
          <Link href="/settings" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", pathname.startsWith("/settings") ? "bg-accent-soft text-accent-strong" : "text-fg-muted hover:bg-surface-2 hover:text-fg")}>
            <GearIcon className="h-5 w-5" /> Réglages
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-3 backdrop-blur">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo small />
            <span className="text-sm font-semibold">Vocal Training <span className="text-fg-subtle font-normal">· Tenor</span></span>
          </Link>
          <Link href="/settings" aria-label="Réglages" className={cn("rounded-lg p-2", pathname.startsWith("/settings") ? "text-accent-strong" : "text-fg-muted")}>
            <GearIcon className="h-5 w-5" />
          </Link>
        </header>

        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-10 animate-fade-in">{children}</main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-bg-elevated/90 backdrop-blur safe-bottom" aria-label="Navigation principale">
          <div className="grid grid-cols-5">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors", active ? "text-accent-strong" : "text-fg-subtle")}>
                  <item.icon className={cn("h-5.5 w-5.5", active && "drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className={cn("grid place-items-center rounded-xl bg-gradient-to-br from-accent to-orange-600 text-black font-black shadow-glow", small ? "h-8 w-8 text-sm" : "h-10 w-10 text-base")} aria-hidden>
      ♪
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8.5 5 3.5-5 3.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
function ToolsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 5v9M11 5v9M15 5v9M19 5v9" />
    </svg>
  );
}
function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
