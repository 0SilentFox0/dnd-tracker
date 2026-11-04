import type { ReactNode } from "react";
import Link from "next/link";

export function HudTile({ href, icon, title, subtitle, compact, badge }: { href: string; icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; compact?: boolean; badge?: ReactNode }) {
  return (
    <Link href={href} className={`flex min-w-0 items-center gap-3 rounded-lg bg-hud-panel ${compact ? "p-2" : "p-3"} shadow-[inset_0_0_0_1px_var(--color-hud-edge)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--color-hud-gold-strong),0_0_12px_var(--color-hud-glow)]`}>
      {icon && <span className={`flex ${compact ? "size-8" : "size-10"} shrink-0 items-center justify-center rounded-md bg-[radial-gradient(var(--color-hud-raised),var(--color-hud-page))] text-hud-gold shadow-[inset_0_0_0_2px_var(--color-hud-gold)]`}>{icon}</span>}
      <span className="min-w-0">
        <span className={`hud-sc block ${compact ? "line-clamp-2 hyphens-auto break-words text-xs" : "truncate text-[15px]"} text-hud-ink`}>{title}</span>
        {subtitle && !compact && <span className="block truncate text-xs text-hud-muted">{subtitle}</span>}
      </span>
      {badge && <span className="ml-auto shrink-0">{badge}</span>}
    </Link>
  );
}
