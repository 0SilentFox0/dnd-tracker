import Link from 'next/link';

import { LandingFog } from '@/components/landing/LandingFog';
import { HERO_SHOT } from '@/components/landing/media';
import { MediaFrame, Screen } from '@/components/landing/MediaFrame';
import { BrandMark } from '@/components/landing/parts';
import { PrimaryCta } from '@/components/landing/PrimaryCta';
import { BRAND } from '@/lib/constants/site';
import type { Locale } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translator';

function Ornament() {
    return (
        <span aria-hidden className="ld-ornament">
            <span />
            <i />
            <span />
        </span>
    );
}

export function Hero({ t, locale }: { t: Translator; locale: Locale }) {
    return (
        <section className="ld-hero relative isolate px-4">
            <LandingFog />
            <div aria-hidden className="ld-hero-scrim" />
            <div className="ld-hero-stage ld-container">
                <div className="ld-hero-copy">
                    <div className="flex items-center gap-4">
                        <BrandMark className="size-12 rounded-xl ring-1 ring-[var(--ld-gold)]/40 sm:size-14" />
                        <div className="space-y-1.5">
                            <p className="hud-sc text-xl tracking-[0.18em] text-hud-ink sm:text-2xl">
                                {BRAND.name}
                            </p>
                            <Ornament />
                        </div>
                    </div>
                    <p className="hud-sc mt-6 text-sm tracking-[0.12em] text-[var(--ld-gold)] sm:text-base">
                        {t('hero.eyebrow')}
                    </p>
                    <h1 className="hud-sc ld-hero-title mt-3 text-hud-ink">
                        <span className="block">{t('hero.titleLead')}</span>
                        <span className="block text-hud-accent-fg">
                            {t('hero.titleAccent')}
                        </span>
                    </h1>
                    <p className="ld-lead mt-6 max-w-[34rem] text-hud-bone">
                        {t('hero.text')}
                    </p>
                    <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                        <PrimaryCta t={t} />
                        <Link
                            prefetch={false}
                            href="#how"
                            className="hud-sc inline-flex h-12 items-center rounded-lg border border-hud-line/80 bg-black/30 px-6 text-base text-hud-ink transition hover:border-hud-muted"
                        >
                            {t('hero.secondary')}
                        </Link>
                    </div>
                    <p className="mt-5 text-sm text-hud-bone">
                        {t('hero.note')}
                    </p>
                </div>
            </div>
            <div className="ld-hero-shot ld-container">
                <div className="ld-tilt">
                    <MediaFrame
                        title={t('hero.eyebrow')}
                        className="shadow-[0_50px_120px_-30px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.2)]"
                    >
                        <Screen
                            locale={locale}
                            id={HERO_SHOT}
                            alt={t('hero.alt')}
                            priority
                            sizes="(min-width: 2560px) 1800px, (min-width: 1024px) 1200px, 100vw"
                        />
                    </MediaFrame>
                </div>
                <div aria-hidden className="ld-shot-fog" />
            </div>
        </section>
    );
}
