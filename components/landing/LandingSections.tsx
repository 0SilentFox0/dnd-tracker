import { ArrowRight, X } from "lucide-react";

import { AURAS, numbered, PAINS, REPLACES, SPELL_FX, STATS } from "@/components/landing/content";
import { D20 } from "@/components/landing/SessionDemo";
import type { Translator } from "@/lib/i18n/translator";
import { cn } from "@/lib/utils";

export function StatsBand({ t }: { t: Translator }) {
  return (
    <section aria-label={t("stats.label")} className="border-y border-hud-rule bg-[#110e0b] px-4 py-10">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 text-center sm:grid-cols-5">
        {STATS.map(({ id, value }) => (
          <div key={id} className="landing-reveal">
            <dt className="sr-only">{t(`stats.items.${id}`)}</dt>
            <dd className="hud-sc bg-gradient-to-b from-[#ffe08a] to-[#c9b37a] bg-clip-text text-4xl text-transparent sm:text-5xl">{value}</dd>
            <dd className="mt-1 text-sm text-hud-bone">{t(`stats.items.${id}`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PainSection({ t }: { t: Translator }) {
  return (
    <section aria-labelledby="pain-title" className="ld-lazy px-4 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <p className="hud-sc text-sm tracking-[0.2em] text-hud-gold">{t("pain.eyebrow")}</p>
          <h2 id="pain-title" className="hud-sc text-3xl text-hud-ink sm:text-4xl">
            {t("pain.title")}
          </h2>
          <ul className="space-y-3">
            {numbered(PAINS).map((n) => (
              <li key={n} className="flex gap-3 text-lg text-hud-bone">
                <X aria-hidden className="mt-1 size-5 shrink-0 text-hud-danger" />
                {t(`pain.items.${n}`)}
              </li>
            ))}
          </ul>
          <p className="hud-sc flex items-center gap-2 text-xl text-hud-gold-strong">
            <ArrowRight aria-hidden className="size-5" />
            {t("pain.outro")}
          </p>
        </div>

        <div aria-hidden className="landing-reveal relative mx-auto w-full max-w-md">
          <div className="space-y-2">
            {REPLACES.map(({ id, icon: Icon }, i) => (
              <div
                key={id}
                style={{ marginLeft: `${(i % 3) * 14}px` }}
                className="relative flex items-center gap-3 rounded-lg border border-hud-rule bg-[#15110d] px-3 py-2 text-hud-bone/70"
              >
                <Icon className="size-4 shrink-0 text-[#8f8473]" />
                <span className="text-sm">{t(`replaces.${id}.title`)}</span>
                <span className="ml-auto text-xs text-[#8f8473]">{t(`replaces.${id}.text`)}</span>
                <span className="absolute inset-x-2 top-1/2 h-px bg-hud-danger/80" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-hud-gold bg-gradient-to-r from-[#2a1d05] via-[#3a2a0c] to-[#2a1d05] px-4 py-3 shadow-[0_0_40px_-8px_rgba(230,194,90,.55)]">
            <span className="hud-sc metal-gold metal-fill grid size-8 place-items-center rounded-md text-xs font-bold">d20</span>
            <span className="hud-sc text-hud-ink">Combat Tracker</span>
            <span className="ml-auto text-xs text-hud-gold-bright">{t("pain.allHere")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function MagicSection({ t }: { t: Translator }) {
  return (
    <section aria-labelledby="magic-title" className="ld-lazy relative isolate overflow-hidden border-y border-hud-rule px-4 py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_30%,rgba(120,80,200,.14),transparent_60%),#0b0908]" />
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <p className="hud-sc text-sm tracking-[0.2em] text-hud-gold">{t("magic.eyebrow")}</p>
        <h2 id="magic-title" className="hud-sc text-3xl text-hud-ink sm:text-4xl">
          {t("magic.title")}
        </h2>
        <p className="text-lg text-hud-bone">
          {t("magic.text")}
        </p>
      </div>

      <ul className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {SPELL_FX.map((fx) => (
          <li key={fx.id} className="landing-reveal flex flex-col items-center gap-3 rounded-xl border border-hud-rule bg-[#120e0b] p-4" style={{ boxShadow: `inset 0 -40px 60px -30px ${fx.glow}` }}>
            <span aria-hidden className="grid size-24 place-items-center">
              <span className={cn("ld-sprite block", fx.sprite, fx.scale)} />
            </span>
            <span className="hud-sc text-center text-hud-ink">{t(`magic.spells.${fx.id}.name`)}</span>
            <span className="text-xs text-[#b3a893]">{t(`magic.spells.${fx.id}.element`)}</span>
          </li>
        ))}
        <li className="landing-reveal flex flex-col items-center gap-3 rounded-xl border border-hud-rule bg-[#120e0b] p-4 shadow-[inset_0_-40px_60px_-30px_rgba(230,120,60,.3)]">
          <span aria-hidden className="grid size-24 place-items-center">
            <D20 value="20" className="ld-d20-spin size-20" />
          </span>
          <span className="hud-sc text-center text-hud-ink">{t("magic.dice.name")}</span>
          <span className="text-xs text-[#b3a893]">{t("magic.dice.note")}</span>
        </li>
      </ul>

      <ul aria-label={t("magic.aurasLabel")} className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2">
        {AURAS.map((a) => (
          <li key={a} className="rounded-full border border-hud-line bg-black/40 px-3 py-1 text-sm text-hud-bone">
            {t(`magic.auras.${a}`)}
          </li>
        ))}
        <li className="rounded-full px-3 py-1 text-sm text-hud-gold">{t("magic.more")}</li>
      </ul>
    </section>
  );
}
