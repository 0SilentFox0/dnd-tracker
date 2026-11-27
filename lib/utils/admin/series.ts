export type DayCount = { day: string; n: number };

const DAY_MS = 86_400_000;

const toMs = (day: string) => Date.parse(`${day}T00:00:00Z`);

export const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (day: string, n: number) =>
    toDay(toMs(day) + n * DAY_MS);

export function dayRange(from: string, to: string): string[] {
    const out: string[] = [];

    for (let t = toMs(from); t <= toMs(to); t += DAY_MS) out.push(toDay(t));

    return out;
}

export function fillDays(rows: DayCount[], from: string, to: string): number[] {
    const byDay = new Map<string, number>();

    for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.n);

    return dayRange(from, to).map((d) => byDay.get(d) ?? 0);
}

export function rollingDistinct(
    activity: { day: string; userId: string }[],
    days: string[],
    window: number
): number[] {
    const byDay = new Map<string, Set<string>>();

    for (const a of activity) {
        const set = byDay.get(a.day) ?? new Set<string>();

        set.add(a.userId);
        byDay.set(a.day, set);
    }

    return days.map((day) => {
        const users = new Set<string>();

        for (let i = 0; i < window; i++) {
            for (const u of byDay.get(addDays(day, -i)) ?? []) users.add(u);
        }

        return users.size;
    });
}

export function delta(current: number, previous: number): number | null {
    return previous === 0 ? null : (current - previous) / previous;
}
