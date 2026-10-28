import { keysOf } from "@/components/landing/messages";
import { SectionTitle } from "@/components/landing/parts";
import type { Translator } from "@/lib/i18n/translator";

export function HowItWorks({ t }: { t: Translator }) {
  return (
    <section id="how" className="ld-lazy scroll-mt-20 border-t border-hud-rule px-4 py-20">
      <SectionTitle eyebrow={t("how.eyebrow")} title={t("how.title")} />
      <ol className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {keysOf(t, "how.steps").map((key, i) => (
          <li key={key} className="landing-reveal relative rounded-xl border border-hud-rule bg-hud-panel p-5 pt-8">
            <span aria-hidden className="metal-gold metal-fill hud-sc absolute -top-5 left-5 grid size-10 place-items-center rounded-full text-lg">
              {i + 1}
            </span>
            <h3 className="hud-sc mb-1 text-lg text-hud-ink">{t(`how.steps.${key}.title`)}</h3>
            <p className="text-sm text-hud-bone">{t(`how.steps.${key}.text`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
