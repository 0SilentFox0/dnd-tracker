import { isSlug, slugify } from "@/lib/utils/templates/slug";

type SluggedRow = Record<string, unknown> & { name: string };

/** Fills a missing slug from the name (slug becomes the first key); existing slugs are kept; any collision throws with both names. */
export function addSlugs<T extends SluggedRow>(rows: T[]): Array<T & { slug: string }> {
  const owner = new Map<string, string>();

  return rows.map((row) => {
    const slug = typeof row.slug === "string" && row.slug ? row.slug : slugify(row.name);

    if (!isSlug(slug)) throw new Error(`Invalid slug "${slug}" for "${row.name}"`);

    const other = owner.get(slug);

    if (other !== undefined) throw new Error(`Slug "${slug}" collides: "${other}" and "${row.name}"`);

    owner.set(slug, row.name);

    const { slug: _drop, ...rest } = row;

    return { slug, ...rest } as T & { slug: string };
  });
}
