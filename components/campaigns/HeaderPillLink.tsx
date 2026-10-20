import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function HeaderPillLink({ href, icon: Icon, label, srLabel }: { href: string; icon: LucideIcon; label: string; srLabel: string }) {
  return (
    <Link
      href={href}
      className="flex h-8 items-center gap-1.5 rounded border border-hud-gold-strong bg-[#8a6414] px-2.5 text-xs font-semibold tracking-[.08em] text-[#fff3d1] shadow-[0_0_10px_rgba(212,160,60,.45)] hover:bg-[#a0761a]"
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{srLabel}</span>
    </Link>
  );
}
