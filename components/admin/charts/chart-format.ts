import { DAY_MS } from '@/lib/constants/time';

export const SERIES_COLORS = [
    'var(--c1)',
    'var(--c2)',
    'var(--c3)',
    'var(--c4)',
    'var(--c5)',
];

export type TimeFormats = {
    tick: (t: number) => string;
    full: (t: number) => string;
};

export function timeFormats(locale: string, times: number[]): TimeFormats {
    const step = times.length > 1 ? times[1] - times[0] : DAY_MS;

    const span = times.length > 1 ? times[times.length - 1] - times[0] : 0;

    const daily = step >= DAY_MS * 0.9;

    const opts = (o: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat(locale, {
            timeZone: daily ? 'UTC' : undefined,
            ...o,
        });

    const date = opts({ day: 'numeric', month: 'short' });

    const time = opts({ hour: '2-digit', minute: '2-digit' });

    const full = opts(
        daily
            ? { day: 'numeric', month: 'short', year: 'numeric' }
            : {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
              }
    );

    return {
        tick: (t) =>
            daily || span > 2 * DAY_MS ? date.format(t) : time.format(t),
        full: (t) => full.format(t),
    };
}
