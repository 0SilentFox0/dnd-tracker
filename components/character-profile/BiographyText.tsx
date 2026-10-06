import { paragraphs, parseHighlights } from "@/lib/utils/characters/biography";

export function BiographyText({ text }: { text: string }) {
  return (
    <div className="hud-book space-y-3 text-[16px] leading-relaxed text-[#e6dccb]">
      {paragraphs(text).map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {parseHighlights(p).map((s, j) =>
            s.marked ? (
              <mark key={j} className="bg-transparent bg-[linear-gradient(transparent_55%,rgba(201,179,122,.45)_55%)] text-[#efe5d2]">
                {s.text}
              </mark>
            ) : (
              s.text
            ),
          )}
        </p>
      ))}
    </div>
  );
}
