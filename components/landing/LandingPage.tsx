import Link from "next/link";

import "@/components/hud/hud.css";
import "@/components/landing/landing.css";
import { HUD_SURFACE } from "@/components/hud";
import type { LandingCopy } from "@/components/landing/copy/types";
import { Brand } from "@/components/landing/parts";
import { Combat } from "@/components/landing/sections/Combat";
import { Hero } from "@/components/landing/sections/Hero";
import { Problem } from "@/components/landing/sections/Problem";
import { SessionSwitch } from "@/components/landing/SessionSwitch";
import { cn } from "@/lib/utils";

const OTHER_LANG = { en: "uk", uk: "en" } as const;

function LandingNav({ copy }: { copy: LandingCopy }) {
  const { nav } = copy;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-hud-rule/60 bg-[#0b0908]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Brand />
        <nav aria-label={nav.aria} className="hidden items-center gap-6 md:flex">
          {nav.items.map((n) => (
            <a key={n.href} href={n.href} className="hud-sc text-sm text-hud-bone transition hover:text-hud-gold-strong">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            prefetch={false}
            href={nav.switchTo.href}
            hrefLang={OTHER_LANG[copy.locale]}
            lang={OTHER_LANG[copy.locale]}
            aria-label={nav.switchLabel}
            className="hud-sc rounded-md border border-hud-line px-2.5 py-1.5 text-xs text-hud-bone hover:text-hud-gold-strong"
          >
            {nav.switchTo.label}
          </Link>
          <SessionSwitch
            member={
              <Link prefetch={false} href="/campaigns" className="hud-sc metal-gold metal-fill rounded-md px-4 py-2 text-sm">
                {nav.myCampaigns}
              </Link>
            }
            guest={
              <>
                <Link prefetch={false} href="/sign-in" className="hud-sc hidden rounded-md px-3 py-2 text-sm text-hud-bone hover:text-hud-gold-strong sm:block">
                  {nav.signIn}
                </Link>
                <Link prefetch={false} href="/sign-up" className="hud-sc metal-gold metal-fill rounded-md px-4 py-2 text-sm">
                  {nav.signUp}
                </Link>
              </>
            }
          />
        </div>
      </div>
    </header>
  );
}

function LandingFooter({ copy }: { copy: LandingCopy["footer"] }) {
  return (
    <footer className="border-t border-hud-rule px-4 py-8 text-sm text-[#b3a893]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Brand />
        <p>
          {copy.tagline} · {new Date().getFullYear()}
        </p>
        <nav className="flex gap-4">
          <Link prefetch={false} href="/sign-in" className="hover:text-hud-gold-strong">
            {copy.signIn}
          </Link>
          <Link prefetch={false} href="/sign-up" className="hover:text-hud-gold-strong">
            {copy.signUp}
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-6xl text-center text-xs sm:text-left">
        {copy.credits} {copy.disclaimer}
      </p>
    </footer>
  );
}

export function LandingPage({ copy }: { copy: LandingCopy }) {
  return (
    <div data-landing lang={copy.locale} className={cn(HUD_SURFACE, "min-h-screen bg-[#0b0908]")}>
      <LandingNav copy={copy} />
      <main>
        <Hero copy={copy.hero} />
        <Problem copy={copy.problem} />
        <Combat copy={copy.combat} />
      </main>
      <LandingFooter copy={copy.footer} />
    </div>
  );
}
