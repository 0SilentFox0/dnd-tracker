import Link from "next/link";
import { Check } from "lucide-react";

import { BRAND, LANDING_PATH } from "@/lib/constants/site";
import type { Locale } from "@/lib/i18n/config";

export function Brand({ locale }: { locale: Locale }) {
  return (
    <Link prefetch={false} href={LANDING_PATH[locale]} className="hud-sc flex items-center gap-2 text-lg text-hud-ink">
      <span aria-hidden className="metal-gold metal-fill grid size-8 place-items-center rounded-md text-sm font-bold">
        {BRAND.mark}
      </span>
      {BRAND.name}
    </Link>
  );
}

export function SectionTitle({ id, eyebrow, title, text, align = "center" }: { id?: string; eyebrow: string; title: string; text?: string; align?: "center" | "left" }) {
  const left = align === "left";

  return (
    <div className={left ? "max-w-xl space-y-3" : "mx-auto max-w-2xl space-y-3 text-center"}>
      <p className="hud-sc text-sm tracking-[0.2em] text-hud-gold">{eyebrow}</p>
      <h2 id={id} className="hud-sc text-3xl text-hud-ink sm:text-4xl">
        {title}
      </h2>
      {text && <p className="text-lg text-hud-bone">{text}</p>}
      {!left && (
        <div aria-hidden className="mx-auto flex max-w-xs items-center gap-3 pt-2">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-hud-gold/60" />
          <span className="size-2 rotate-45 border border-hud-gold" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-hud-gold/60" />
        </div>
      )}
    </div>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li key={p} className="flex gap-2 text-hud-bone">
          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-hud-gold-strong" />
          {p}
        </li>
      ))}
    </ul>
  );
}
