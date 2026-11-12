const INVALID_COLOR_FALLBACK = '#2a2018';

export function normalizeHexColor(color: string): string {
    const value = color.trim().toLowerCase();

    if (/^#[\da-f]{3}$/.test(value))
        return `#${[...value.slice(1)].map((channel) => channel + channel).join('')}`;

    return /^#[\da-f]{6}$/.test(value) ? value : INVALID_COLOR_FALLBACK;
}

function luminance(hex: string): number {
    const pairs = hex.slice(1).match(/[\da-f]{2}/g);

    const channels = pairs?.map((value) => parseInt(value, 16) / 255) ?? [
        0, 0, 0,
    ];

    const linear = channels.map((channel) =>
        channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
    );

    return (
        0.2126 * (linear[0] ?? 0) +
        0.7152 * (linear[1] ?? 0) +
        0.0722 * (linear[2] ?? 0)
    );
}

export function contrastTextColor(background: string): '#000000' | '#ffffff' {
    const relativeLuminance = luminance(normalizeHexColor(background));

    const contrastWithBlack = (relativeLuminance + 0.05) / 0.05;

    const contrastWithWhite = 1.05 / (relativeLuminance + 0.05);

    return contrastWithBlack >= contrastWithWhite ? '#000000' : '#ffffff';
}
