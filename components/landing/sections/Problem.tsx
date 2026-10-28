import { ArrowRight, X } from "lucide-react";

import type { LandingCopy } from "@/components/landing/copy/types";
import { PROBLEM_ICONS } from "@/components/landing/media";
import { BRAND } from "@/lib/constants/site";

export function Problem({ copy }: { copy: LandingCopy["problem"] }) {
  return (
    <section aria-labelledby="pain-title" className="ld-lazy px-4 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <p className="hud-sc text-sm tracking-[0.2em] text-hud-gold">{copy.eyebrow}</p>
          <h2 id="pain-title" className="hud-sc text-3xl text-hud-ink sm:text-4xl">
            {copy.title}
          </h2>
          <ul className="space-y-3">
            {copy.pains.map((p) => (
              <li key={p} className="flex gap-3 text-lg text-hud-bone">
                <X aria-hidden className="mt-1 size-5 shrink-0 text-hud-danger" />
                {p}
              </li>
            ))}
          </ul>
          <p className="hud-sc flex items-start gap-2 text-xl text-hud-gold-strong">
            <ArrowRight aria-hidden className="mt-1 size-5 shrink-0" />
            {copy.resolve}
          </p>
        </div>

        <div aria-hidden className="landing-reveal relative mx-auto w-full max-w-md">
          <div className="space-y-2">
            {copy.replaces.map(({ title, text }, i) => {
              const Icon = PROBLEM_ICONS[i];

              return (
                <div
                  key={title}
                  style={{ marginLeft: `${(i % 3) * 14}px` }}
                  className="relative flex items-center gap-3 rounded-lg border border-hud-rule bg-[#15110d] px-3 py-2 text-hud-bone/70"
                >
                  <Icon className="size-4 shrink-0 text-[#8f8473]" />
                  <span className="text-sm">{title}</span>
                  <span className="ml-auto text-xs text-[#8f8473]">{text}</span>
                  <span className="absolute inset-x-2 top-1/2 h-px bg-hud-danger/80" />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-hud-gold bg-gradient-to-r from-[#2a1d05] via-[#3a2a0c] to-[#2a1d05] px-4 py-3 shadow-[0_0_40px_-8px_rgba(230,194,90,.55)]">
            <span className="hud-sc metal-gold metal-fill grid size-8 place-items-center rounded-md text-xs font-bold">{BRAND.mark}</span>
            <span className="hud-sc text-hud-ink">{BRAND.name}</span>
            <span className="ml-auto text-xs text-hud-gold-bright">{copy.hubTag}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
