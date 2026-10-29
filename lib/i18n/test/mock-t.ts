import type { Translator } from "../translator";

function plainValues(values?: Record<string, unknown>): Record<string, string | number> | undefined {
  if (!values) return undefined;

  return Object.fromEntries(Object.entries(values).filter(([, v]) => typeof v === "string" || typeof v === "number")) as Record<string, string | number>;
}

export function makeT(namespace?: string): Translator {
  const t = (key: string, values?: Record<string, string | number>) => {
    const full = namespace ? `${namespace}.${key}` : key;

    return values && Object.keys(values).length > 0 ? `${full} ${JSON.stringify(values)}` : full;
  };

  const rich = (key: string, values?: Record<string, unknown>) => t(key, plainValues(values));

  return Object.assign(t, { has: () => true, raw: () => ({}), rich, markup: rich });
}
