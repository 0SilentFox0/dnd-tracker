import type { LandingCopy } from "@/components/landing/copy/types";
import { SectionTitle } from "@/components/landing/parts";

export function HowItWorks({ copy }: { copy: LandingCopy["how"] }) {
  return (
    <section id="how" className="ld-lazy scroll-mt-20 border-t border-hud-rule px-4 py-20">
      <SectionTitle eyebrow={copy.eyebrow} title={copy.title} />
      <ol className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {copy.steps.map(({ title, text }, i) => (
          <li key={title} className="landing-reveal relative rounded-xl border border-hud-rule bg-hud-panel p-5 pt-8">
            <span aria-hidden className="metal-gold metal-fill hud-sc absolute -top-5 left-5 grid size-10 place-items-center rounded-full text-lg">
              {i + 1}
            </span>
            <h3 className="hud-sc mb-1 text-lg text-hud-ink">{title}</h3>
            <p className="text-sm text-hud-bone">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
