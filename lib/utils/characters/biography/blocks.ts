import { paragraphs } from "./highlight";

export type BioBlock =
  | { kind: "heading"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

export type BioInline = { text: string; bold: boolean };

const HEADING = /^#\s+/;

const QUOTE = /^>\s?/;

const ITEM = /^[•\-–]\s+/;

/** Light markup for biographies: `# heading`, `> quote`, `• item` / `- item` lines; anything else is prose. */
export function parseBiography(src: string): BioBlock[] {
  const out: BioBlock[] = [];

  for (const para of paragraphs(src)) {
    let prose: string[] = [];

    const flush = () => {
      if (prose.length) out.push({ kind: "paragraph", text: prose.join("\n") });

      prose = [];
    };

    for (const raw of para.split("\n")) {
      const line = raw.trim();

      if (!line) continue;

      if (HEADING.test(line)) {
        flush();
        out.push({ kind: "heading", text: line.replace(HEADING, "") });
      } else if (QUOTE.test(line)) {
        flush();

        const last = out[out.length - 1];

        const text = line.replace(QUOTE, "");

        if (last?.kind === "quote") last.text += `\n${text}`;
        else out.push({ kind: "quote", text });
      } else if (ITEM.test(line)) {
        flush();

        const last = out[out.length - 1];

        const item = line.replace(ITEM, "");

        if (last?.kind === "list") last.items.push(item);
        else out.push({ kind: "list", items: [item] });
      } else {
        prose.push(line);
      }
    }

    flush();
  }

  return out;
}

export function parseBold(text: string): BioInline[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((t, i) => ({ text: t, bold: i % 2 === 1 }))
    .filter((s) => s.text);
}
