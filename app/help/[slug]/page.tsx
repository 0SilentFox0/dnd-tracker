import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HudFormPage, HudSection } from '@/components/hud/form';
import { HelpArticleView } from '@/components/onboarding/HelpArticleView';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import { getHelpArticle, HELP_ARTICLES } from '@/lib/onboarding/help';

export function generateStaticParams() {
    return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function HelpArticlePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const article = getHelpArticle(slug);

    if (!article) notFound();

    const locale = await getRequestLocale();

    const [t, ui] = await Promise.all([
        getTranslator(locale, 'help'),
        getTranslator(locale, 'onboarding'),
    ]);

    return (
        <HudFormPage
            title={t(`${article.slug}.title`)}
            aside={
                <Link
                    href="/help"
                    className="text-hud-accent-fg hover:underline"
                >
                    {ui('ui.allHelp')}
                </Link>
            }
        >
            <HudSection>
                <p className="mb-3 text-sm text-hud-muted">
                    {t(`${article.slug}.summary`)}
                </p>
                <HelpArticleView article={article} t={t} />
            </HudSection>
        </HudFormPage>
    );
}
