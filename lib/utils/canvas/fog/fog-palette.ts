import {
    DEFAULT_FOG_PALETTE,
    type FogPalette,
    type Rgb,
} from './cloud-texture';

export function parseCssColor(value: string): Rgb | null {
    const text = value.trim().toLowerCase();

    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text)?.[1];

    if (hex) {
        const full =
            hex.length === 3
                ? hex
                      .split('')
                      .map((c) => c + c)
                      .join('')
                : hex;

        return [
            parseInt(full.slice(0, 2), 16),
            parseInt(full.slice(2, 4), 16),
            parseInt(full.slice(4, 6), 16),
        ];
    }

    const fn = /^rgba?\(([^)]+)\)$/.exec(text)?.[1];

    if (!fn) return null;

    const parts = fn
        .split(/[\s,/]+/)
        .filter(Boolean)
        .slice(0, 3)
        .map(Number);

    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;

    return [parts[0], parts[1], parts[2]].map((n) =>
        Math.min(255, Math.max(0, Math.round(n)))
    ) as unknown as Rgb;
}

export function readFogPalette(element: Element | null): FogPalette {
    if (!element || typeof getComputedStyle === 'undefined')
        return DEFAULT_FOG_PALETTE;

    const style = getComputedStyle(element);

    const token = (name: string) => style.getPropertyValue(name).trim();

    return {
        shadow:
            parseCssColor(token('--fog-shadow')) ?? DEFAULT_FOG_PALETTE.shadow,
        light: parseCssColor(token('--fog-light')) ?? DEFAULT_FOG_PALETTE.light,
        flat: token('--fog-flat') || DEFAULT_FOG_PALETTE.flat,
        moon: 0,
    };
}
