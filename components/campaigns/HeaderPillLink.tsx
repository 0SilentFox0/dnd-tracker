import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const PILL = "flex h-8 items-center gap-1.5 rounded border border-hud-gold-strong bg-[#8a6414] px-2.5 text-xs font-semibold tracking-[.08em] text-[#fff3d1] shadow-[0_0_10px_rgba(212,160,60,.45)]";

export function HeaderPillLink({ href, icon: Icon, label, srLabel, "data-tour": dataTour }: { href: string | null; icon: LucideIcon; label: string; srLabel: string; "data-tour"?: string }) {
  const content = (
    <>
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{srLabel}</span>
    </>
  );

  if (!href) return <span aria-disabled data-tour={dataTour} className={`${PILL} opacity-70`}>{content}</span>;

  return <Link href={href} data-tour={dataTour} className={`${PILL} hover:bg-[#a0761a]`}>{content}</Link>;
}
