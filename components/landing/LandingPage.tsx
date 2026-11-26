import { LandingShell } from '@/components/landing/chrome';
import { buildLandingJsonLd } from '@/components/landing/landing-metadata';
import { AiSection } from '@/components/landing/sections/AiSection';
import { Combat } from '@/components/landing/sections/Combat';
import { Faq } from '@/components/landing/sections/Faq';
import { Features } from '@/components/landing/sections/Features';
import { FinalCta } from '@/components/landing/sections/FinalCta';
import { Hero } from '@/components/landing/sections/Hero';
import { HowItWorks } from '@/components/landing/sections/HowItWorks';
import { Mechanics } from '@/components/landing/sections/Mechanics';
import { Players } from '@/components/landing/sections/Players';
import { Prep } from '@/components/landing/sections/Prep';
import { Problem } from '@/components/landing/sections/Problem';
import { Replace } from '@/components/landing/sections/Replace';
import { Systems } from '@/components/landing/sections/Systems';
import { LANDING_PATH } from '@/lib/constants/site';
import type { Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/translator';

export async function LandingPage({ locale }: { locale: Locale }) {
    const t = await getTranslator(locale, 'landing');

    return (
        <LandingShell t={t} locale={locale} localeHrefs={LANDING_PATH}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(
                        buildLandingJsonLd(t, locale)
                    ).replace(/</g, '\\u003c'),
                }}
            />
            <main>
                <Hero t={t} locale={locale} />
                <div className="ld-below">
                    <Problem t={t} />
                    <Replace t={t} />
                    <Combat t={t} locale={locale} />
                    <Features t={t} locale={locale} />
                    <Mechanics t={t} locale={locale} />
                    <Systems t={t} />
                    <Prep t={t} locale={locale} />
                    <AiSection t={t} />
                    <Players t={t} locale={locale} />
                    <HowItWorks t={t} />
                    <Faq t={t} />
                    <FinalCta t={t} />
                </div>
            </main>
        </LandingShell>
    );
}
