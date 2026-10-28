import { ShieldCheck } from "lucide-react";

import { AiMock } from "@/components/landing/AiMock";
import type { LandingCopy } from "@/components/landing/copy/types";
import { MediaFrame } from "@/components/landing/MediaFrame";
import { CheckList } from "@/components/landing/parts";

export function AiSection({ copy }: { copy: LandingCopy["ai"] }) {
  return (
    <section id="ai" className="ld-lazy relative isolate scroll-mt-20 overflow-hidden border-y border-hud-rule px-4 py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_40%,rgba(138,92,201,.16),transparent_60%),#0b0908]" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <MediaFrame title={copy.screen} className="landing-reveal">
          <div role="img" aria-label={copy.alt}>
            <AiMock copy={copy.mock} />
          </div>
        </MediaFrame>
        <div className="space-y-5">
          <p className="hud-sc text-sm tracking-[0.2em] text-hud-gold">{copy.eyebrow}</p>
          <h2 className="hud-sc text-3xl text-hud-ink sm:text-4xl">{copy.title}</h2>
          <p className="text-lg text-hud-bone">{copy.text}</p>
          <CheckList items={copy.points} />
          <p className="flex gap-3 rounded-lg border border-[#8a5cc9]/50 bg-[#8a5cc9]/10 p-4 text-sm text-hud-bone">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-[#c9a8f0]" />
            {copy.honesty}
          </p>
        </div>
      </div>
    </section>
  );
}
