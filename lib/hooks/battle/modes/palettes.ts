export type PaletteKey =
    | 'mode'
    | 'terrain'
    | 'weather'
    | 'motion'
    | 'background';

export type PaletteState = Record<PaletteKey, boolean>;

export const PALETTE_KEYS: readonly PaletteKey[] = [
    'mode',
    'terrain',
    'weather',
    'motion',
    'background',
];

/** Щойно відкрита палітра витісняє решту відкритих. */
export function palettesToClose(
    prev: PaletteState,
    next: PaletteState
): PaletteKey[] {
    const opened = PALETTE_KEYS.filter((k) => next[k] && !prev[k]);

    return opened.length === 0
        ? []
        : PALETTE_KEYS.filter((k) => next[k] && !opened.includes(k));
}
