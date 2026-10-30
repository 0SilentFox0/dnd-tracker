export type MarkdownBlock = { kind: "text"; text: string } | { kind: "table"; header: string[]; rows: string[][] };

const cells = (line: string): string[] => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

const isRow = (line: string) => line.includes("|");

const isSeparator = (line: string) => isRow(line) && cells(line).every((c) => /^:?-{2,}:?$/.test(c));

export function parseMarkdownLite(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  const blocks: MarkdownBlock[] = [];

  let text: string[] = [];

  const flush = () => {
    const joined = text.join("\n").trim();

    if (joined) blocks.push({ kind: "text", text: joined });

    text = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const next = lines[i + 1];

    if (isRow(lines[i]) && next !== undefined && isSeparator(next)) {
      flush();

      const header = cells(lines[i]);

      const rows: string[][] = [];

      i += 2;

      while (i < lines.length && isRow(lines[i]) && lines[i].trim()) {
        rows.push(cells(lines[i]));
        i += 1;
      }

      i -= 1;
      blocks.push({ kind: "table", header, rows });
    } else {
      text.push(lines[i]);
    }
  }

  flush();

  return blocks;
}

export const hasMarkdownTable = (source: string): boolean => parseMarkdownLite(source).some((b) => b.kind === "table");
