import type { PaletteId } from '@/types/theme';

export const PALETTE_IDS = ['tavern', 'parchment'] as const;
// Enable palettes after WCAG AA contrast checks pass across shared HUD and spellbook surfaces.
export const PALETTES_ENABLED = true;
export const DEFAULT_PALETTE: PaletteId = 'tavern';
export const LIGHT_PALETTES: readonly PaletteId[] = ['parchment'];

export const LEGACY_PALETTES: Readonly<Record<string, PaletteId>> = {
    midnight: 'tavern',
    forest: 'tavern',
    amethyst: 'tavern',
    frost: 'parchment',
};

export interface PalettePreview {
    page: string;
    panel: string;
    inset: string;
    crimson: string;
    ink: string;
    muted: string;
}

export const PALETTE_PREVIEW: Record<PaletteId, PalettePreview> = {
    tavern: {
        page: '#111013',
        panel: '#18161a',
        inset: '#0a090b',
        crimson: '#b3312c',
        ink: '#ece4d6',
        muted: '#8b8277',
    },
    parchment: {
        page: '#e9e1d1',
        panel: '#f1ebdf',
        inset: '#dbd0bc',
        crimson: '#a12b28',
        ink: '#1e1711',
        muted: '#64584b',
    },
};

export function isPaletteId(value: unknown): value is PaletteId {
    return (
        typeof value === 'string' &&
        (PALETTE_IDS as readonly string[]).includes(value)
    );
}

export function paletteFor(value: unknown): PaletteId {
    if (isPaletteId(value)) return value;

    return (
        (typeof value === 'string' && Object.hasOwn(LEGACY_PALETTES, value)
            ? LEGACY_PALETTES[value]
            : undefined) ?? DEFAULT_PALETTE
    );
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
