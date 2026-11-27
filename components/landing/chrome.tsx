import Link from 'next/link';

import '@/components/hud/hud.css';
import '@/components/landing/landing.css';
import '@/components/landing/landing-motion.css';
import { LocaleSwitcher } from '@/components/common/shell/LocaleSwitcher';
import { HUD_SURFACE } from '@/components/hud';
import { LandingBackdrop } from '@/components/landing/LandingBackdrop';
import { keysOf } from '@/components/landing/messages';
import { Brand } from '@/components/landing/parts';
import { PointerParallax } from '@/components/landing/PointerParallax';
import { SessionSwitch } from '@/components/landing/SessionSwitch';
import { BRAND, LEGAL_DOCS, LEGAL_PATH } from '@/lib/constants/site';
import type { Locale } from '@/lib/i18n/config';
import { FixedLocaleProvider } from '@/lib/i18n/fixed-locale-provider';
import type { Translator } from '@/lib/i18n/translator';
import { cn } from '@/lib/utils';

export function LandingNav({
    t,
    locale,
    localeHrefs,
    anchorBase,
}: {
    t: Translator;
    locale: Locale;
    localeHrefs: Record<Locale, string>;
    anchorBase: string;
}) {
    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-hud-rule/60 bg-hud-page/85 backdrop-blur-md">
            <div className="ld-container flex h-16 items-center justify-between gap-4">
                <Brand locale={locale} />
                <nav
                    aria-label={t('nav.aria')}
                    className="hidden items-center gap-6 md:flex"
                >
                    {keysOf(t, 'nav.items').map((id) => (
                        <a
                            key={id}
                            href={`${anchorBase}#${id}`}
                            className="hud-sc text-sm text-hud-bone transition hover:text-hud-ink"
                        >
                            {t(`nav.items.${id}`)}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-2">
                    <LocaleSwitcher hrefs={localeHrefs} />
                    <SessionSwitch
                        member={
                            <Link
                                prefetch={false}
                                href="/campaigns"
                                className="hud-sc metal-gold metal-fill rounded-lg px-4 py-2 text-sm"
                            >
                                {t('nav.myCampaigns')}
                            </Link>
                        }
                        guest={
                            <>
                                <Link
                                    prefetch={false}
                                    href="/sign-in"
                                    className="hud-sc hidden rounded-lg px-3 py-2 text-sm text-hud-bone hover:text-hud-ink sm:block"
                                >
                                    {t('nav.signIn')}
                                </Link>
                                <Link
                                    prefetch={false}
                                    href="/sign-up"
                                    className="hud-sc metal-gold metal-fill rounded-lg px-4 py-2 text-sm"
                                >
                                    {t('nav.signUp')}
                                </Link>
                            </>
                        }
                    />
                </div>
            </div>
        </header>
    );
}

export function LandingFooter({
    t,
    locale,
}: {
    t: Translator;
    locale: Locale;
}) {
    return (
        <footer className="ld-panel border-t border-hud-rule py-8 text-sm text-hud-soft">
            <div className="ld-container flex flex-col items-center justify-between gap-4 sm:flex-row">
                <Brand locale={locale} />
                <p>
                    {t('footer.tagline')} · {new Date().getFullYear()}
                </p>
                <nav aria-label={t('footer.navAria')} className="flex gap-4">
                    <Link
                        prefetch={false}
                        href="/sign-in"
                        className="inline-flex min-h-10 items-center px-1 hover:text-hud-ink"
                    >
                        {t('footer.signIn')}
                    </Link>
                    <Link
                        prefetch={false}
                        href="/sign-up"
                        className="inline-flex min-h-10 items-center px-1 hover:text-hud-ink"
                    >
                        {t('footer.signUp')}
                    </Link>
                </nav>
            </div>
            <nav
                aria-label={t('footer.legalAria')}
                className="ld-container mt-4 flex flex-wrap justify-center gap-4 sm:justify-start"
            >
                {LEGAL_DOCS.map((doc) => (
                    <Link
                        key={doc}
                        prefetch={false}
                        href={LEGAL_PATH[locale][doc]}
                        className="inline-flex min-h-10 items-center px-1 hover:text-hud-ink"
                    >
                        {t(`footer.legal.${doc}`)}
                    </Link>
                ))}
            </nav>
            <p className="ld-container mt-6 text-center text-xs sm:text-left">
                {t('footer.credits')} {t('footer.srd')}{' '}
                {t('footer.disclaimer', { brand: BRAND.name })}
            </p>
        </footer>
    );
}

export function LandingShell({
    t,
    locale,
    localeHrefs,
    anchorBase = '',
    children,
}: {
    t: Translator;
    locale: Locale;
    localeHrefs: Record<Locale, string>;
    anchorBase?: string;
    children: React.ReactNode;
}) {
    return (
        <FixedLocaleProvider locale={locale}>
            <div
                data-landing
                lang={locale}
                className={cn(
                    HUD_SURFACE,
                    'relative isolate min-h-screen bg-hud-page'
                )}
            >
                <LandingBackdrop />
                <PointerParallax />
                <LandingNav
                    t={t}
                    locale={locale}
                    localeHrefs={localeHrefs}
                    anchorBase={anchorBase}
                />
                {children}
                <LandingFooter t={t} locale={locale} />
            </div>
        </FixedLocaleProvider>
    );
}
