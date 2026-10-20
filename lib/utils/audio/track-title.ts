/** Нова назва для перейменування або null: порожня, скасована (null) чи та сама — не зберігаємо. */
export function normalizeTrackTitle(raw: string | null, current: string): string | null {
  const title = raw?.trim();

  return title && title !== current ? title : null;
}
