import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SessionDemo } from "@/components/landing/SessionDemo";
import { SessionSwitch } from "@/components/landing/SessionSwitch";
import type { Translator } from "@/lib/i18n/translator";

const CTA_CLASS =
  "hud-sc metal-gold metal-fill inline-flex h-12 items-center gap-2 rounded-lg px-7 text-base shadow-[0_8px_30px_-8px_rgba(230,194,90,.6)] transition hover:brightness-110";

function CtaLink({ href, label }: { href: string; label: string }) {
  return (
    <Link prefetch={false} href={href} className={CTA_CLASS}>
      {label}
      <ChevronRight aria-hidden className="size-4" />
    </Link>
  );
}

export function PrimaryCta({ t }: { t: Translator }) {
  return <SessionSwitch guest={<CtaLink href="/sign-up" label={t("cta.start")} />} member={<CtaLink href="/campaigns" label={t("cta.toCampaigns")} />} />;
}

export function LandingHero({ t }: { t: Translator }) {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-28 sm:pt-36">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(230,194,90,.2),transparent_55%),radial-gradient(ellipse_at_50%_70%,rgba(200,90,40,.12),transparent_60%),#0b0908]" />
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <p className="hud-sc text-sm tracking-[0.2em] text-hud-gold">{t("hero.eyebrow")}</p>
        <h1 className="hud-sc text-4xl leading-[1.05] text-hud-ink sm:text-6xl lg:text-7xl">
          {t("hero.title1")}
          <br />
          <span className="bg-gradient-to-r from-[#e6c25a] via-[#ffe08a] to-[#c9b37a] bg-clip-text text-transparent">{t("hero.title2")}</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-hud-bone sm:text-xl">
          {t("hero.text")}
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PrimaryCta t={t} />
          <SessionSwitch
            member={null}
            guest={
              <Link
                prefetch={false}
                href="/sign-in"
                className="hud-sc inline-flex h-12 items-center rounded-lg border border-hud-line bg-black/40 px-6 text-base text-hud-ink transition hover:border-hud-gold hover:text-hud-gold-strong"
              >
                {t("nav.signIn")}
              </Link>
            }
          />
        </div>
        <p className="text-sm text-[#b3a893]">{t("hero.note")}</p>
      </div>
      <div className="mt-14 sm:mt-20">
        <SessionDemo t={t} />
      </div>
    </section>
  );
}
