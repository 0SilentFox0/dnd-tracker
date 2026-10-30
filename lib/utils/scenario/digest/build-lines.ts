export interface DigestPage {
  id: string;
  title: string;
  arc: string | null;
  sortOrder: number;
  llm: { digest: string; stale: boolean } | null;
  sections: { title: string; played: boolean; lead: string }[];
  entities: string[];
}

export type DigestLevel = 0 | 1 | 2 | 3;

export function pageLine(page: DigestPage, level: DigestLevel): string {
  if (page.llm) return `- ${page.title} [${page.id}]: ${page.llm.digest}${page.llm.stale ? " (stale)" : ""}`;

  const head = `- ${page.title} [${page.id}]${page.arc ? ` (${page.arc})` : ""}`;

  const parts: string[] = [];

  if (level <= 1) {
    for (const s of page.sections) {
      const lead = level === 0 && s.lead ? ` — ${s.lead}` : "";

      parts.push(`§ ${s.title}${s.played ? " ✓" : ""}${lead}`);
    }
  }

  if (level <= 2 && page.entities.length) parts.push(`entities: ${page.entities.join(", ")}`);

  return parts.length ? `${head}: ${parts.join("; ")}` : head;
}
