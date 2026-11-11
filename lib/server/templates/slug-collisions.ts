export function dropTakenSlugs<T extends { id: string; slug?: string | null }>(incoming: T[], taken: ReadonlyMap<string, string>): T[] {
  const claimed = new Set<string>();

  return incoming.map((row) => {
    const slug = row.slug;

    if (!slug) return row;

    const owner = taken.get(slug);

    if ((owner && owner !== row.id) || claimed.has(slug)) return { ...row, slug: null };

    claimed.add(slug);

    return row;
  });
}
