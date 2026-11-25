const DAY_MS = 86_400_000;

export function formatRelativeDays(
    locale: string,
    iso: string,
    now: number
): string {
    const days = Math.round((new Date(iso).getTime() - now) / DAY_MS);

    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
        days,
        'day'
    );
}
