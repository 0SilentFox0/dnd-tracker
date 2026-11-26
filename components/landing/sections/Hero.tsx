import Link from 'next/link';

import { MediaFrame, Screen } from '@/components/landing/MediaFrame';
import { PrimaryCta } from '@/components/landing/PrimaryCta';
import type { Locale } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translator';

export function Hero({ t, locale }: { t: Translator; locale: Locale }) {
    return (
        <section className="relative isolate overflow-hidden px-4 pt-28 pb-20 sm:pt-36">
            <div className="ld-container ld-panel max-w-3xl space-y-6 rounded-2xl p-6 text-center sm:p-10">
                <p className="hud-sc text-sm tracking-[0.2em] text-[var(--ld-gold)]">
                    {t('hero.eyebrow')}
                </p>
                <h1 className="hud-sc ld-h1 leading-[1.05] text-hud-ink">
                    {t('hero.titleLead')}
                    <br />
                    <span className="text-hud-accent-fg">
                        {t('hero.titleAccent')}
                    </span>
                </h1>
                <p className="mx-auto max-w-2xl ld-lead text-hud-bone">
                    {t('hero.text')}
                </p>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <PrimaryCta t={t} />
                    <Link
                        prefetch={false}
                        href="#how"
                        className="hud-sc inline-flex h-12 items-center rounded-lg border border-hud-line bg-black/40 px-6 text-base text-hud-ink transition hover:border-hud-muted hover:text-hud-ink"
                    >
                        {t('hero.secondary')}
                    </Link>
                </div>
                <p className="text-sm text-hud-soft">{t('hero.note')}</p>
            </div>
            <div className="ld-container mt-14 sm:mt-20">
                <MediaFrame
                    title={t('hero.eyebrow')}
                    className="shadow-[0_40px_100px_-30px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.18),0_0_80px_-20px_rgba(230,140,60,.25)]"
                >
                    <Screen
                        locale={locale}
                        id="combat"
                        alt={t('hero.alt')}
                        priority
                        sizes="(min-width: 1024px) 1024px, 100vw"
                    />
                </MediaFrame>
            </div>
        </section>
    );
}
