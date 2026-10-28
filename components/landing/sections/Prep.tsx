import type { LandingCopy } from "@/components/landing/copy/types";
import { MediaFrame, Screen } from "@/components/landing/MediaFrame";
import { CheckList, SectionTitle } from "@/components/landing/parts";

export function Prep({ copy }: { copy: LandingCopy["prep"] }) {
  return (
    <section id="prep" className="ld-lazy scroll-mt-20 px-4 py-20">
      <SectionTitle eyebrow={copy.eyebrow} title={copy.title} text={copy.text} />
      <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-3">
        {copy.panels.map((p) => (
          <article key={p.id} className="landing-reveal flex flex-col gap-4 rounded-2xl border border-hud-line bg-gradient-to-b from-[#1a140f] to-[#110e0b] p-4 shadow-[inset_0_1px_0_rgba(230,194,90,.15)]">
            <MediaFrame title={p.screen}>
              <Screen id={p.id} alt={p.alt} sizes="(min-width: 1024px) 380px, 100vw" />
            </MediaFrame>
            <div className="space-y-3 px-1 pb-1">
              <p className="hud-sc text-xs tracking-[0.2em] text-hud-gold">{p.eyebrow}</p>
              <h3 className="hud-sc text-xl text-hud-ink">{p.title}</h3>
              <p className="text-sm text-hud-bone">{p.text}</p>
              <CheckList items={p.points} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
