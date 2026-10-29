import Link from "next/link";
import { notFound } from "next/navigation";

import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { HelpArticleView } from "@/components/onboarding/HelpArticleView";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { getHelpArticle, HELP_ARTICLES } from "@/lib/onboarding/help";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const article = getHelpArticle(slug);

  if (!article) notFound();

  const locale = await getRequestLocale();

  const [t, ui] = await Promise.all([getTranslator(locale, "help"), getTranslator(locale, "onboarding")]);

  return (
    <HudPage>
      <HudPageHeader
        title={t(`${article.slug}.title`)}
        subtitle={t(`${article.slug}.summary`)}
        actions={
          <Link href="/help" className="self-center text-sm text-hud-gold hover:underline">
            {ui("ui.allHelp")}
          </Link>
        }
      />
      <HudPanel>
        <HelpArticleView article={article} t={t} />
      </HudPanel>
    </HudPage>
  );
}
