import type { ReactNode } from "react";
import Link from "next/link";

export function HudTile({ href, icon, title, subtitle }: { href: string; icon?: ReactNode; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg bg-[rgba(20,16,12,.85)] p-3 shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)] transition-shadow hover:shadow-[inset_0_0_0_1px_#e6c25a,0_0_12px_rgba(230,194,90,.18)]">
      {icon && <span className="metal-bronze flex size-10 shrink-0 items-center justify-center rounded-md bg-[radial-gradient(#2c2219,#0f0c09)] text-[#e8d6b0] shadow-[inset_0_0_0_2px_var(--m2)]">{icon}</span>}
      <span className="min-w-0">
        <span className="hud-sc block truncate text-[15px] text-[#efe5d2]">{title}</span>
        {subtitle && <span className="block truncate text-xs text-[#8f8473]">{subtitle}</span>}
      </span>
    </Link>
  );
}
