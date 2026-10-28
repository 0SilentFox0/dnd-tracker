import { LANDING_TEMPLATES } from "@/components/landing/flags";
import { CAPABILITY_ICONS } from "@/components/landing/media";
import { MediaFrame, Screen } from "@/components/landing/MediaFrame";
import { SectionTitle } from "@/components/landing/parts";
import type { Translator } from "@/lib/i18n/translator";

export function Mechanics({ t }: { t: Translator }) {
  return (
    <section id="mechanics" className="ld-lazy relative isolate scroll-mt-20 overflow-hidden border-y border-hud-rule px-4 py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_10%,rgba(230,194,90,.1),transparent_55%),#0b0908]" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div className="space-y-5">
          <SectionTitle align="left" eyebrow={t("mechanics.eyebrow")} title={t("mechanics.title")} text={t("mechanics.text")} />
          {LANDING_TEMPLATES && <p className="hud-sc text-hud-gold-strong">{t("mechanics.templatesNote")}</p>}
        </div>
        <MediaFrame title={t("mechanics.eyebrow")} className="landing-reveal">
          <Screen id="mechanics" alt={t("mechanics.alt")} />
        </MediaFrame>
      </div>

      <ul className="mx-auto mt-14 grid max-w-6xl gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(CAPABILITY_ICONS).map(([id, Icon]) => {

          return (
            <li key={id} className="landing-reveal group flex gap-3 border-l-2 border-hud-rule py-2 pl-4 transition hover:border-hud-gold">
              <Icon aria-hidden className="mt-1 size-5 shrink-0 text-hud-gold transition group-hover:text-hud-gold-bright" />
              <div>
                <h3 className="hud-sc text-lg text-hud-ink">{t(`mechanics.capabilities.${id}.title`)}</h3>
                <p className="text-sm text-[#b3a893]">{t(`mechanics.capabilities.${id}.text`)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-[#8f8473]">{t("mechanics.footnote")}</p>
    </section>
  );
}
