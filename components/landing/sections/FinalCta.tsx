import Image from 'next/image';
import Link from 'next/link';

import { LandingFog } from '@/components/landing/LandingFog';
import { TrailMark } from '@/components/landing/parts';
import { PrimaryCta } from '@/components/landing/PrimaryCta';
import { SessionSwitch } from '@/components/landing/SessionSwitch';
import type { Translator } from '@/lib/i18n/translator';

export function FinalCta({ t }: { t: Translator }) {
    return (
        <section className="ld-lazy relative isolate overflow-hidden px-4 py-36 sm:py-44">
            <Image
                src="/landing/candle.webp"
                alt=""
                fill
                sizes="100vw"
                className="-z-10 object-cover opacity-40"
            />
            <div className="absolute inset-0 -z-10 [background:radial-gradient(ellipse_at_center,rgba(11,9,8,.35),#0b0908_75%)]" />
            <LandingFog variant="final" />
            <div className="ld-cta-light ld-reveal mx-auto max-w-2xl space-y-4 text-center">
                <TrailMark className="mx-auto" />
                <h2 className="hud-sc text-3xl text-hud-ink sm:text-4xl">
                    {t('cta.title')}
                </h2>
                <p className="text-lg text-hud-bone">{t('cta.text')}</p>
                <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
                    <PrimaryCta t={t} />
                    <SessionSwitch
                        member={null}
                        guest={
                            <Link
                                prefetch={false}
                                href="/sign-in"
                                className="hud-sc inline-flex h-12 items-center rounded-lg border border-hud-line bg-black/40 px-6 text-base text-hud-ink transition hover:border-hud-muted hover:text-hud-ink"
                            >
                                {t('nav.signIn')}
                            </Link>
                        }
                    />
                </div>
            </div>
        </section>
    );
}
