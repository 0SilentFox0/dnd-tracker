import Link from "next/link";

import type { HelpArticle, HelpBlock } from "@/lib/onboarding/types";

function Block({ block }: { block: HelpBlock }) {
  if (block.kind === "p") return <p>{block.text}</p>;

  if (block.kind === "list") {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <Link href={block.href} className="inline-block text-hud-gold hover:underline">
      {block.text}
    </Link>
  );
}

export function HelpArticleView({ article }: { article: HelpArticle }) {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-hud-ink">
      {article.sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h2 className="hud-sc text-base text-hud-gold">{section.heading}</h2>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}
    </div>
  );
}
