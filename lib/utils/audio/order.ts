export function moveTrack(ids: string[], index: number, dir: -1 | 1): string[] {
  const to = index + dir;

  if (index < 0 || to < 0 || to >= ids.length) return ids;

  const next = [...ids];

  [next[index], next[to]] = [next[to], next[index]];

  return next;
}
