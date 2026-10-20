export type PaletteKey = "mode" | "terrain" | "weather";

export type PaletteState = Record<PaletteKey, boolean>;

const KEYS: readonly PaletteKey[] = ["mode", "terrain", "weather"];

/** Щойно відкрита палітра витісняє решту відкритих. */
export function palettesToClose(prev: PaletteState, next: PaletteState): PaletteKey[] {
  const opened = KEYS.filter((k) => next[k] && !prev[k]);

  return opened.length === 0 ? [] : KEYS.filter((k) => next[k] && !opened.includes(k));
}
