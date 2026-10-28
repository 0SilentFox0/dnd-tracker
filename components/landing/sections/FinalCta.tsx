import Image from "next/image";
import Link from "next/link";

import type { LandingCopy } from "@/components/landing/copy/types";
import { PrimaryCta } from "@/components/landing/PrimaryCta";
import { SessionSwitch } from "@/components/landing/SessionSwitch";

export function FinalCta({ copy }: { copy: Pick<LandingCopy, "cta" | "hero" | "nav"> }) {
  return (
    <section className="ld-lazy relative isolate overflow-hidden px-4 py-24">
      <Image src="/landing/candle.webp" alt="" fill sizes="100vw" className="-z-10 object-cover opacity-40" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(11,9,8,.35),#0b0908_75%)]" />
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <h2 className="hud-sc text-3xl text-hud-ink sm:text-4xl">{copy.cta.title}</h2>
        <p className="text-lg text-hud-bone">{copy.cta.text}</p>
        <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
          <PrimaryCta copy={copy.hero} />
          <SessionSwitch
            member={null}
            guest={
              <Link
                prefetch={false}
                href="/sign-in"
                className="hud-sc inline-flex h-12 items-center rounded-lg border border-hud-line bg-black/40 px-6 text-base text-hud-ink transition hover:border-hud-gold hover:text-hud-gold-strong"
              >
                {copy.nav.signIn}
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
