export interface DigestItem {
  id: string;
  title: string;
  sortOrder: number;
  digest: string;
  stale: boolean;
}

export function fitLines(lines: string[], maxChars: number): string {
  const out: string[] = [];

  let used = 0;

  for (const line of lines) {
    const cost = line.length + (out.length ? 1 : 0);

    if (used + cost > maxChars) break;

    out.push(line);
    used += cost;
  }

  const marker = (omitted: number) => `- … ${omitted} more pages omitted`;

  while (out.length < lines.length) {
    const text = [...out, marker(lines.length - out.length)].join("\n");

    if (text.length <= maxChars) return text;

    if (!out.pop()) break;
  }

  return out.join("\n");
}

export function summariesDigest(items: DigestItem[], opts: { maxChars: number }): string {
  const lines = [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => `- ${item.title} [${item.id}]: ${item.digest}${item.stale ? " (stale)" : ""}`);

  return fitLines(lines, opts.maxChars);
}
