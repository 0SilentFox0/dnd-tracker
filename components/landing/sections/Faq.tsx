import { ChevronDown } from "lucide-react";

import type { LandingCopy } from "@/components/landing/copy/types";
import { SectionTitle } from "@/components/landing/parts";

export function Faq({ copy }: { copy: LandingCopy["faq"] }) {
  return (
    <section id="faq" className="ld-lazy scroll-mt-20 border-t border-hud-rule px-4 py-20">
      <SectionTitle eyebrow={copy.eyebrow} title={copy.title} />
      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {copy.items.map(({ q, a }) => (
          <details key={q} className="landing-reveal group rounded-xl border border-hud-rule bg-hud-panel open:border-hud-gold/50">
            <summary className="hud-sc flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-lg text-hud-ink [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown aria-hidden className="size-5 shrink-0 text-hud-gold transition group-open:rotate-180" />
            </summary>
            <p className="px-4 pb-4 text-hud-bone">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
