import type { Translator } from "../translator";

export function makeT(namespace?: string): Translator {
  const t = (key: string, values?: Record<string, string | number>) => {
    const full = namespace ? `${namespace}.${key}` : key;

    return values && Object.keys(values).length > 0 ? `${full} ${JSON.stringify(values)}` : full;
  };

  return Object.assign(t, { has: () => true, raw: () => ({}) });
}
