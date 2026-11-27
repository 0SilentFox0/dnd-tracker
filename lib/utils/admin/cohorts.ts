import { addDays, toDay } from './series';

export type CohortRow = {
    cohortWeek: string;
    size: number;
    rates: (number | null)[];
};

export function weekStart(isoOrDay: string): string {
    const ms = Date.parse(
        isoOrDay.length === 10 ? `${isoOrDay}T00:00:00Z` : isoOrDay
    );

    const dow = (new Date(ms).getUTCDay() + 6) % 7;

    return addDays(toDay(ms), -dow);
}

export function cohortRetention(
    signups: { userId: string; createdAt: string }[],
    activity: { userId: string; day: string }[],
    weeks: number[],
    today: string
): CohortRow[] {
    const cohorts = new Map<string, string[]>();

    for (const s of signups) {
        const week = weekStart(s.createdAt);

        cohorts.set(week, [...(cohorts.get(week) ?? []), s.userId]);
    }

    const daysByUser = new Map<string, string[]>();

    for (const a of activity) {
        daysByUser.set(a.userId, [...(daysByUser.get(a.userId) ?? []), a.day]);
    }

    return [...cohorts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cohortWeek, users]) => ({
            cohortWeek,
            size: users.length,
            rates: weeks.map((w) => {
                const start = addDays(cohortWeek, 7 * w);

                if (start > today) return null;

                const end = addDays(start, 6);

                const active = users.filter((u) =>
                    (daysByUser.get(u) ?? []).some(
                        (d) => d >= start && d <= end
                    )
                ).length;

                return active / users.length;
            }),
        }));
}
