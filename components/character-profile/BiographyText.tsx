import { Fragment } from "react";

import { parseBiography, parseBold, parseHighlights } from "@/lib/utils/characters/biography";

function Inline({ text }: { text: string }) {
  return parseHighlights(text).map((s, i) =>
    s.marked ? (
      <mark key={i} className="bg-transparent text-hud-bone underline decoration-[#c9b37a]/60 decoration-1 underline-offset-4">
        {s.text}
      </mark>
    ) : (
      <Fragment key={i}>{parseBold(s.text).map((b, j) => (b.bold ? <strong key={j} className="font-semibold text-hud-gold">{b.text}</strong> : b.text))}</Fragment>
    ),
  );
}

export function BiographyText({ text }: { text: string }) {
  return (
    <div className="hud-book space-y-3.5 text-[16px] leading-[1.7] text-hud-bone">
      {parseBiography(text).map((b, i) => {
        if (b.kind === "heading") {
          return (
            <h3 key={i} className="hud-sc flex items-center gap-3 pt-3 text-[12px] uppercase tracking-[.14em] text-hud-gold after:h-px after:flex-1 after:bg-[#3a2f20] first:pt-0">
              {b.text}
            </h3>
          );
        }

        if (b.kind === "quote") {
          return (
            <blockquote key={i} className="whitespace-pre-line border-l-2 border-[#c9b37a]/60 py-0.5 pl-4 text-[17px] italic text-[#e8dcc2]">
              <Inline text={b.text} />
            </blockquote>
          );
        }

        if (b.kind === "list") {
          return (
            <ul key={i} className="space-y-1.5">
              {b.items.map((item, j) => (
                <li key={j} className="relative pl-5 before:absolute before:left-0 before:top-[.15em] before:text-[10px] before:text-hud-gold before:content-['◆']">
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="whitespace-pre-line">
            <Inline text={b.text} />
          </p>
        );
      })}
    </div>
  );
}
