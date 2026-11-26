import Link from 'next/link';

import { LandingShell } from '@/components/landing/chrome';
import { keysOf } from '@/components/landing/messages';
import {
    BRAND,
    LANDING_PATH,
    LEGAL,
    LEGAL_DOCS,
    LEGAL_PATH,
    type LegalDoc,
} from '@/lib/constants/site';
import type { Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/translator';

const PLACEHOLDERS = {
    brand: BRAND.name,
    operatorName: LEGAL.operatorName,
    operatorAddress: LEGAL.operatorAddress,
    contactEmail: LEGAL.contactEmail,
    jurisdiction: LEGAL.jurisdiction,
    updatedAt: LEGAL.updatedAt,
};

export async function LegalPage({
    locale,
    doc,
}: {
    locale: Locale;
    doc: LegalDoc;
}) {
    const [t, landing] = await Promise.all([
        getTranslator(locale, 'legal'),
        getTranslator(locale, 'landing'),
    ]);

    const sections = keysOf(t, `${doc}.sections`).length;

    const localeHrefs = {
        en: LEGAL_PATH.en[doc],
        uk: LEGAL_PATH.uk[doc],
    };

    return (
        <LandingShell
            t={landing}
            locale={locale}
            localeHrefs={localeHrefs}
            anchorBase={LANDING_PATH[locale]}
        >
            <main className="ld-container px-4 pt-28 pb-16">
                <article className="ld-panel mx-auto max-w-[65ch] rounded-lg p-6 sm:p-10">
                    <nav
                        aria-label={t('page.navAria')}
                        className="mb-6 flex flex-wrap gap-4 text-sm text-hud-soft"
                    >
                        {LEGAL_DOCS.map((d) => (
                            <Link
                                key={d}
                                prefetch={false}
                                href={LEGAL_PATH[locale][d]}
                                aria-current={d === doc ? 'page' : undefined}
                                className={
                                    d === doc
                                        ? 'text-hud-ink'
                                        : 'hover:text-hud-ink'
                                }
                            >
                                {t(`page.navLabels.${d}`)}
                            </Link>
                        ))}
                    </nav>
                    <h1 className="ld-h2">{t(`${doc}.title`)}</h1>
                    <p className="mt-2 text-sm text-hud-soft">
                        {t('page.updated', PLACEHOLDERS)}
                    </p>
                    {Array.from({ length: sections }, (_, i) => {
                        const key = `${doc}.sections.${i + 1}`;

                        return (
                            <section key={key} className="mt-8">
                                <h2 className="hud-sc text-lg text-hud-ink">
                                    {t(`${key}.heading`, PLACEHOLDERS)}
                                </h2>
                                {t(`${key}.body`, PLACEHOLDERS)
                                    .split('\n\n')
                                    .map((paragraph) => (
                                        <p
                                            key={paragraph}
                                            className="mt-3 leading-relaxed text-hud-bone"
                                        >
                                            {paragraph}
                                        </p>
                                    ))}
                            </section>
                        );
                    })}
                    <p className="mt-10">
                        <Link
                            prefetch={false}
                            href={LANDING_PATH[locale]}
                            className="hud-sc text-sm text-hud-soft hover:text-hud-ink"
                        >
                            {t('page.backToHome')}
                        </Link>
                    </p>
                </article>
            </main>
        </LandingShell>
    );
}
