"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "xl";

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-black hover:bg-accent-strong shadow-glow font-semibold",
  secondary: "bg-surface-2 text-fg hover:bg-surface-3 border border-border-strong",
  ghost: "bg-transparent text-fg-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30",
  outline: "bg-transparent text-fg border border-border-strong hover:border-accent hover:text-accent-strong",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-sm rounded-xl gap-2",
  lg: "h-13 px-6 text-base rounded-xl gap-2",
  xl: "h-16 px-8 text-lg rounded-2xl gap-3",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export function Button({ variant = "primary", size = "md", full, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", size = "md", full, className, children }: { href: string; variant?: Variant; size?: Size; full?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] select-none whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        full && "w-full",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ className, children, glow, as: Tag = "div" }: { className?: string; children: ReactNode; glow?: boolean; as?: "div" | "section" | "article" }) {
  return <Tag className={cn("rounded-2xl border border-border bg-surface p-4 sm:p-5", glow && "shadow-glow border-accent/30", className)}>{children}</Tag>;
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-3 mb-3", className)}>
      <h2 className="text-base font-semibold tracking-tight text-fg">{children}</h2>
      {action}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle", className)}>{children}</p>;
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", !color && "bg-surface-3 text-fg-muted", className)}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, color, className, height = 8, label }: { value: number; color?: string; className?: string; height?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-surface-3", className)} style={{ height }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: color ?? "var(--color-accent)" }} />
    </div>
  );
}

export function Stat({ label, value, hint, emoji }: { label: string; value: ReactNode; hint?: string; emoji?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        {emoji && <span className="text-base">{emoji}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-fg-subtle">{hint}</div>}
    </div>
  );
}

export function Callout({ tone = "info", title, children, className }: { tone?: "info" | "success" | "warning" | "danger"; title?: string; children: ReactNode; className?: string }) {
  const tones = {
    info: "border-info/30 bg-info/10 text-fg",
    success: "border-success/30 bg-success/10 text-fg",
    warning: "border-warning/30 bg-warning/10 text-fg",
    danger: "border-danger/30 bg-danger/10 text-fg",
  } as const;
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div className="text-fg-muted">{children}</div>
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-fg-muted">{label}</span>
        <span className="font-mono text-fg tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, className }: { options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-xl bg-surface-2 p-1 border border-border", className)} role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 h-9 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
            o.value === value ? "bg-accent text-black shadow" : "text-fg-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center">
      <div className="text-3xl">{emoji}</div>
      <div className="mt-2 font-semibold">{title}</div>
      {children && <div className="mt-1 text-sm text-fg-muted">{children}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cn("h-5 w-5 animate-spin rounded-full border-2 border-fg-subtle border-t-accent", className)} aria-label="Chargement" />;
}
