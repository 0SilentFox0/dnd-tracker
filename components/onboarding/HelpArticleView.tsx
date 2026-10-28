import Link from "next/link";

import type { Translator } from "@/lib/i18n/translator";
import type { HelpArticleDef, HelpBlockDef } from "@/lib/onboarding/types";

function Block({ block, base, t }: { block: HelpBlockDef; base: string; t: Translator }) {
  if (block.kind === "p") return <p>{t(base)}</p>;

  if (block.kind === "list") {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {Array.from({ length: block.count }, (_, k) => (
          <li key={k}>{t(`${base}.i${k}`)}</li>
        ))}
      </ul>
    );
  }

  return (
    <Link href={block.href} className="inline-block text-hud-gold hover:underline">
      {t(base)}
    </Link>
  );
}

export function HelpArticleView({ article, t }: { article: HelpArticleDef; t: Translator }) {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-hud-ink">
      {article.sections.map((section, i) => {
        const base = `${article.slug}.sections.s${i}`;

        return (
          <section key={i} className="space-y-2">
            <h2 className="hud-sc text-base text-hud-gold">{t(`${base}.heading`)}</h2>
            {section.blocks.map((block, j) => (
              <Block key={j} block={block} base={`${base}.b${j}`} t={t} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
