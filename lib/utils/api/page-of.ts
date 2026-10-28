export type Page<T> = { items: T[]; hasMore: boolean; nextOffset: number | null };

/** `rows` were fetched with `take: limit + 1`. */
export function pageOf<T>(rows: T[], offset: number, limit: number): Page<T> {
  const hasMore = rows.length > limit;

  return { items: rows.slice(0, limit), hasMore, nextOffset: hasMore ? offset + limit : null };
}
