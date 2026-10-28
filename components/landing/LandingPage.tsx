import Link from "next/link";

import "@/components/hud/hud.css";
import "@/components/landing/landing.css";
import { LocaleSwitcher } from "@/components/common/LocaleSwitcher";
import { HUD_SURFACE } from "@/components/hud";
import { buildLandingJsonLd } from "@/components/landing/landing-metadata";
import { keysOf } from "@/components/landing/messages";
import { Brand } from "@/components/landing/parts";
import { AiSection } from "@/components/landing/sections/AiSection";
import { Combat } from "@/components/landing/sections/Combat";
import { Faq } from "@/components/landing/sections/Faq";
import { FinalCta } from "@/components/landing/sections/FinalCta";
import { Hero } from "@/components/landing/sections/Hero";
import { HowItWorks } from "@/components/landing/sections/HowItWorks";
import { Mechanics } from "@/components/landing/sections/Mechanics";
import { Players } from "@/components/landing/sections/Players";
import { Prep } from "@/components/landing/sections/Prep";
import { Problem } from "@/components/landing/sections/Problem";
import { SessionSwitch } from "@/components/landing/SessionSwitch";
import { BRAND, LANDING_PATH } from "@/lib/constants/site";
import type { Locale } from "@/lib/i18n/config";
import { FixedLocaleProvider } from "@/lib/i18n/fixed-locale-provider";
import { getTranslator, type Translator } from "@/lib/i18n/translator";
import { cn } from "@/lib/utils";

function LandingNav({ t }: { t: Translator }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-hud-rule/60 bg-[#0b0908]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Brand />
        <nav aria-label={t("nav.aria")} className="hidden items-center gap-6 md:flex">
          {keysOf(t, "nav.items").map((id) => (
            <a key={id} href={`#${id}`} className="hud-sc text-sm text-hud-bone transition hover:text-hud-gold-strong">
              {t(`nav.items.${id}`)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher hrefs={LANDING_PATH} />
          <SessionSwitch
            member={
              <Link prefetch={false} href="/campaigns" className="hud-sc metal-gold metal-fill rounded-md px-4 py-2 text-sm">
                {t("nav.myCampaigns")}
              </Link>
            }
            guest={
              <>
                <Link prefetch={false} href="/sign-in" className="hud-sc hidden rounded-md px-3 py-2 text-sm text-hud-bone hover:text-hud-gold-strong sm:block">
                  {t("nav.signIn")}
                </Link>
                <Link prefetch={false} href="/sign-up" className="hud-sc metal-gold metal-fill rounded-md px-4 py-2 text-sm">
                  {t("nav.signUp")}
                </Link>
              </>
            }
          />
        </div>
      </div>
    </header>
  );
}

function LandingFooter({ t }: { t: Translator }) {
  return (
    <footer className="border-t border-hud-rule px-4 py-8 text-sm text-[#b3a893]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Brand />
        <p>
          {t("footer.tagline")} · {new Date().getFullYear()}
        </p>
        <nav aria-label={t("footer.navAria")} className="flex gap-4">
          <Link prefetch={false} href="/sign-in" className="hover:text-hud-gold-strong">
            {t("footer.signIn")}
          </Link>
          <Link prefetch={false} href="/sign-up" className="hover:text-hud-gold-strong">
            {t("footer.signUp")}
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-6xl text-center text-xs sm:text-left">
        {t("footer.credits")} {t("footer.disclaimer", { brand: BRAND.name })}
      </p>
    </footer>
  );
}

export async function LandingPage({ locale }: { locale: Locale }) {
  const t = await getTranslator(locale, "landing");

  return (
    <FixedLocaleProvider locale={locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLandingJsonLd(t, locale)).replace(/</g, "\\u003c") }} />
      <div data-landing lang={locale} className={cn(HUD_SURFACE, "min-h-screen bg-[#0b0908]")}>
        <LandingNav t={t} />
        <main>
          <Hero t={t} />
          <Problem t={t} />
          <Combat t={t} />
          <Mechanics t={t} />
          <Prep t={t} />
          <AiSection t={t} />
          <Players t={t} />
          <HowItWorks t={t} />
          <Faq t={t} />
          <FinalCta t={t} />
        </main>
        <LandingFooter t={t} />
      </div>
    </FixedLocaleProvider>
  );
}
