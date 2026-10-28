export function groupBy<T, K>(items: readonly T[], keyFn: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);

    const list = groups.get(key);

    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  return groups;
}

export const toggleItem = <T>(list: readonly T[] | undefined, item: T): T[] => ((list ?? []).includes(item) ? (list ?? []).filter((x) => x !== item) : [...(list ?? []), item]);
