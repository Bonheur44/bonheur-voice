import { cn } from "@/lib/utils";

export function Logo({ small }: { small?: boolean }) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-xl bg-gradient-to-br from-accent to-orange-600 font-black text-black shadow-glow",
        small ? "h-8 w-8 text-sm" : "h-10 w-10 text-base",
      )}
      aria-hidden
    >
      ♪
    </div>
  );
}
