import type { PaletteId } from '@/types/theme';

export const PALETTE_IDS = [
    'tavern',
    'midnight',
    'forest',
    'parchment',
    'amethyst',
    'frost',
] as const;
// Enable palettes after WCAG AA contrast checks pass across shared HUD and spellbook surfaces.
export const PALETTES_ENABLED = true;
export const DEFAULT_PALETTE: PaletteId = 'tavern';
export const LIGHT_PALETTES: readonly PaletteId[] = ['parchment', 'frost'];

export const PALETTE_SWATCHES: Record<
    PaletteId,
    readonly [string, string, string]
> = {
    tavern: ['#110e0b', '#c9b37a', '#e6dccb'],
    midnight: ['#0c1424', '#8dbcf4', '#e1eafa'],
    forest: ['#0d1913', '#9ec89c', '#e1eddf'],
    parchment: ['#f3ead7', '#795522', '#30271c'],
    amethyst: ['#191124', '#c5a2e8', '#ede2f7'],
    frost: ['#edf4fa', '#275f90', '#203448'],
};

export function isPaletteId(value: unknown): value is PaletteId {
    return (
        typeof value === 'string' &&
        (PALETTE_IDS as readonly string[]).includes(value)
    );
}

export function paletteFor(value: unknown): PaletteId {
    return isPaletteId(value) ? value : DEFAULT_PALETTE;
}

export function isPalettePath(pathname: string): boolean {
    return (
        pathname !== '/' &&
        pathname !== '/uk' &&
        !/^\/(sign-in|sign-up|forgot-password|reset-password)(\/|$)/.test(
            pathname
        ) &&
        !pathname.includes('/dm/print')
    );
}
