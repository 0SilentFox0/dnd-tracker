import Link from "next/link";

import { MediaFrame, Screen } from "@/components/landing/MediaFrame";
import { PrimaryCta } from "@/components/landing/PrimaryCta";
import type { Translator } from "@/lib/i18n/translator";

export function Hero({ t }: { t: Translator }) {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-28 sm:pt-36">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(230,194,90,.2),transparent_55%),radial-gradient(ellipse_at_50%_70%,rgba(200,90,40,.12),transparent_60%),#0b0908]" />
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <p className="hud-sc text-sm tracking-[0.2em] text-hud-gold">{t("hero.eyebrow")}</p>
        <h1 className="hud-sc text-4xl leading-[1.05] text-hud-ink sm:text-6xl lg:text-7xl">
          {t("hero.titleLead")}
          <br />
          <span className="bg-gradient-to-r from-[#e6c25a] via-[#ffe08a] to-[#c9b37a] bg-clip-text text-transparent">{t("hero.titleAccent")}</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-hud-bone sm:text-xl">{t("hero.text")}</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PrimaryCta t={t} />
          <Link
            prefetch={false}
            href="#how"
            className="hud-sc inline-flex h-12 items-center rounded-lg border border-hud-line bg-black/40 px-6 text-base text-hud-ink transition hover:border-hud-gold hover:text-hud-gold-strong"
          >
            {t("hero.secondary")}
          </Link>
        </div>
        <p className="text-sm text-[#b3a893]">{t("hero.note")}</p>
      </div>
      <div className="mx-auto mt-14 max-w-5xl sm:mt-20">
        <MediaFrame title={t("hero.eyebrow")} className="shadow-[0_40px_100px_-30px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.18),0_0_80px_-20px_rgba(230,140,60,.25)]">
          <Screen id="combat" alt={t("hero.alt")} priority sizes="(min-width: 1024px) 1024px, 100vw" />
        </MediaFrame>
      </div>
    </section>
  );
}
