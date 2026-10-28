import { parseTable } from "@/lib/utils/content/import/table";

export type TokenKind = "spells" | "units" | "artifacts";

export interface CatalogEntry { kind: TokenKind; slug: string; imagePath: string }

export const TOKEN_SIZE: Record<TokenKind, number> = { spells: 256, artifacts: 256, units: 384 };

const KIND_OF: Record<string, TokenKind> = { spell: "spells", unit: "units", artefact: "artifacts" };

export function parseCatalog(csv: string): CatalogEntry[] {
  return parseTable(csv, "catalog.csv").rows.flatMap((r) => {
    const [prefix, slug] = String(r.record_id ?? "").split(":");

    const kind = KIND_OF[prefix];

    return kind && slug ? [{ kind, slug, imagePath: String(r.image_path) }] : [];
  });
}

export function mapToTemplate(entries: CatalogEntry[], slugs: Record<TokenKind, readonly string[]>) {
  const picked: Array<CatalogEntry & { via?: string }> = [];

  const templateOnly: Array<{ kind: TokenKind; slug: string }> = [];

  const used = new Set<string>();

  for (const kind of Object.keys(slugs) as TokenKind[]) {
    const catalog = entries.filter((e) => e.kind === kind).sort((a, b) => a.slug.localeCompare(b.slug));

    const bySlug = new Map(catalog.map((e) => [e.slug, e]));

    for (const slug of slugs[kind]) {
      const direct = bySlug.get(slug);

      const variant = direct ?? catalog.find((e) => e.slug.startsWith(`${slug}-`));

      if (!variant) {
        templateOnly.push({ kind, slug });
        continue;
      }

      used.add(`${kind}:${variant.slug}`);
      picked.push({ kind, slug, imagePath: variant.imagePath, ...(direct ? {} : { via: variant.slug }) });
    }
  }

  return { picked, templateOnly, catalogOnly: entries.filter((e) => !used.has(`${e.kind}:${e.slug}`)).length };
}
