import Link from "next/link";
import { notFound } from "next/navigation";

import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { HelpArticleView } from "@/components/onboarding/HelpArticleView";
import { getHelpArticle, HELP_ARTICLES } from "@/lib/onboarding/help";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const article = getHelpArticle(slug);

  if (!article) notFound();

  return (
    <HudPage>
      <HudPageHeader
        title={article.title}
        subtitle={article.summary}
        actions={
          <Link href="/help" className="self-center text-sm text-hud-gold hover:underline">
            Уся довідка
          </Link>
        }
      />
      <HudPanel>
        <HelpArticleView article={article} />
      </HudPanel>
    </HudPage>
  );
}
