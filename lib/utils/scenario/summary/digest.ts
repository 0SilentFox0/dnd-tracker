export interface DigestItem {
  id: string;
  title: string;
  sortOrder: number;
  digest: string;
  stale: boolean;
}

export function summariesDigest(items: DigestItem[], opts: { maxChars: number }): string {
  const out: string[] = [];

  let used = 0;

  for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const line = `- ${item.title} [${item.id}]: ${item.digest}${item.stale ? " (stale)" : ""}`;

    const cost = line.length + (out.length ? 1 : 0);

    if (used + cost > opts.maxChars) break;

    out.push(line);
    used += cost;
  }

  return out.join("\n");
}
