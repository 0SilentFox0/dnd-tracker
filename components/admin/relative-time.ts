const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
];

export function formatRelative(iso: string, locale: string, now: number) {
    const diff = Date.parse(iso) - now;

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    for (const [unit, ms] of UNITS)
        if (Math.abs(diff) >= ms)
            return rtf.format(Math.round(diff / ms), unit);

    return rtf.format(0, 'minute');
}
