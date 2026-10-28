const isNil = (value: unknown): boolean => value === undefined;

export function patchDefined<T extends object>(obj: T, patch: Partial<T>, isEmpty: (value: unknown) => boolean = isNil): T {
  const next: Record<string, unknown> = { ...obj, ...patch };

  for (const key of Object.keys(patch)) {
    if (isEmpty(next[key])) delete next[key];
  }

  return next as T;
}
