import type { LandingCopy } from "@/components/landing/copy/types";
import { LANDING_TEMPLATES } from "@/components/landing/flags";
import { CAPABILITY_ICONS } from "@/components/landing/media";
import { MediaFrame, Screen } from "@/components/landing/MediaFrame";
import { SectionTitle } from "@/components/landing/parts";

export function Mechanics({ copy }: { copy: LandingCopy["mechanics"] }) {
  return (
    <section id="mechanics" className="ld-lazy relative isolate scroll-mt-20 overflow-hidden border-y border-hud-rule px-4 py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_10%,rgba(230,194,90,.1),transparent_55%),#0b0908]" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div className="space-y-5">
          <SectionTitle align="left" eyebrow={copy.eyebrow} title={copy.title} text={copy.text} />
          {LANDING_TEMPLATES && <p className="hud-sc text-hud-gold-strong">{copy.templatesNote}</p>}
        </div>
        <MediaFrame title={copy.eyebrow} className="landing-reveal">
          <Screen id="mechanics" alt={copy.alt} />
        </MediaFrame>
      </div>

      <ul className="mx-auto mt-14 grid max-w-6xl gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {copy.capabilities.map(({ id, title, text }) => {
          const Icon = CAPABILITY_ICONS[id];

          return (
            <li key={id} className="landing-reveal group flex gap-3 border-l-2 border-hud-rule py-2 pl-4 transition hover:border-hud-gold">
              <Icon aria-hidden className="mt-1 size-5 shrink-0 text-hud-gold transition group-hover:text-hud-gold-bright" />
              <div>
                <h3 className="hud-sc text-lg text-hud-ink">{title}</h3>
                <p className="text-sm text-[#b3a893]">{text}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-[#8f8473]">{copy.footnote}</p>
    </section>
  );
}
