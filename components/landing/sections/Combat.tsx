import type { LandingCopy } from "@/components/landing/copy/types";
import { FX_SPRITES } from "@/components/landing/media";
import { SectionTitle } from "@/components/landing/parts";
import { D20, SessionDemo } from "@/components/landing/SessionDemo";
import { cn } from "@/lib/utils";

export function Combat({ copy }: { copy: LandingCopy["combat"] }) {
  const { fx } = copy;

  return (
    <section id="combat" className="ld-lazy scroll-mt-20 border-t border-hud-rule px-4 py-20">
      <SectionTitle eyebrow={copy.eyebrow} title={copy.title} text={copy.text} />
      <div className="mx-auto mt-14 max-w-6xl">
        <SessionDemo copy={copy.demo} steps={copy.demoSteps} />

        <ol className="mt-20 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {copy.points.map(({ title, text }, i) => (
            <li key={title} className="landing-reveal flex gap-4 border-t border-hud-rule pt-4">
              <span aria-hidden className="hud-sc text-3xl leading-none text-hud-gold/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="hud-sc text-lg text-hud-ink">{title}</h3>
                <p className="mt-1 text-sm text-[#b3a893]">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="relative isolate mt-20 overflow-hidden rounded-2xl border border-hud-rule px-4 py-12 sm:px-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_30%,rgba(120,80,200,.16),transparent_60%),#0e0b09]" />
          <div className="mx-auto max-w-2xl space-y-2 text-center">
            <h3 className="hud-sc text-2xl text-hud-ink sm:text-3xl">{fx.title}</h3>
            <p className="text-hud-bone">{fx.text}</p>
          </div>
          <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {fx.names.map((name, i) => {
              const sprite = FX_SPRITES[i];

              return (
                <li key={name} className="flex flex-col items-center gap-2 rounded-xl border border-hud-rule bg-[#120e0b] p-4" style={{ boxShadow: `inset 0 -40px 60px -30px ${sprite.glow}` }}>
                  <span aria-hidden className="grid size-24 place-items-center">
                    <span className={cn("ld-sprite block", sprite.sprite, sprite.scale)} />
                  </span>
                  <span className="hud-sc text-center text-sm text-hud-ink">{name}</span>
                </li>
              );
            })}
            <li className="flex flex-col items-center gap-2 rounded-xl border border-hud-rule bg-[#120e0b] p-4 shadow-[inset_0_-40px_60px_-30px_rgba(230,120,60,.3)]">
              <span aria-hidden className="grid size-24 place-items-center">
                <D20 value="20" className="ld-d20-spin size-20" />
              </span>
              <span className="hud-sc text-center text-sm text-hud-ink">3D</span>
            </li>
          </ul>
          <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
            {fx.auras.map((a) => (
              <li key={a} className="rounded-full border border-hud-line bg-black/40 px-3 py-1 text-sm text-hud-bone">
                {a}
              </li>
            ))}
            <li className="rounded-full px-3 py-1 text-sm text-hud-gold">{fx.more}…</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
