export interface ExistingRoot {
  id: string;
  name: string;
  maps: number;
  markers: number;
}

export function describeRoot(r: ExistingRoot): string {
  return `«${r.name}» (вкладених карт: ${r.maps - 1}, маркерів: ${r.markers})`;
}

/** Повертає корені до видалення; без --replace будь-який наявний корінь блокує сід. */
export function rootsToReplace(roots: ExistingRoot[], replace: boolean): ExistingRoot[] {
  if (roots.length === 0) return [];

  if (!replace) throw new Error(`У кампанії вже є кореневі карти: ${roots.map(describeRoot).join(", ")}. Для заміни додайте --replace.`);

  return roots;
}
