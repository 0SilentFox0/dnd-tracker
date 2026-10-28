import type { LandingCopy } from "@/components/landing/copy/types";
import { MediaFrame, Screen } from "@/components/landing/MediaFrame";
import { CheckList, SectionTitle } from "@/components/landing/parts";

export function Players({ copy }: { copy: LandingCopy["players"] }) {
  const [phone, hero] = copy.panels;

  return (
    <section id="players" className="ld-lazy scroll-mt-20 px-4 py-20">
      <SectionTitle eyebrow={copy.eyebrow} title={copy.title} text={copy.text} />
      <div className="mx-auto mt-12 grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
        <article className="landing-reveal flex flex-col items-center gap-6 sm:flex-row">
          <div className="w-44 shrink-0 rounded-[1.6rem] border-2 border-[#3a2e22] bg-[#0b0908] p-2 shadow-[0_30px_60px_-10px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.25)]">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#2a2218]" />
            <Screen id={phone.id} alt={phone.alt} sizes="176px" className="overflow-hidden rounded-xl" />
          </div>
          <div className="space-y-3">
            <p className="hud-sc text-xs tracking-[0.2em] text-hud-gold">{phone.eyebrow}</p>
            <h3 className="hud-sc text-2xl text-hud-ink">{phone.title}</h3>
            <p className="text-hud-bone">{phone.text}</p>
            <CheckList items={phone.points} />
          </div>
        </article>
        <article className="landing-reveal space-y-4">
          <MediaFrame title={hero.screen}>
            <Screen id={hero.id} alt={hero.alt} />
          </MediaFrame>
          <div className="space-y-3">
            <p className="hud-sc text-xs tracking-[0.2em] text-hud-gold">{hero.eyebrow}</p>
            <h3 className="hud-sc text-2xl text-hud-ink">{hero.title}</h3>
            <p className="text-hud-bone">{hero.text}</p>
            <CheckList items={hero.points} />
          </div>
        </article>
      </div>
    </section>
  );
}
