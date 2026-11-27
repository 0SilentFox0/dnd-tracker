export type SharedIpRow = {
    ip: string;
    userId: string;
    country: string | null;
    device: string | null;
    days: string[];
};

export type SharedIpGroup = {
    ip: string;
    country: string | null;
    accounts: { userId: string; device: string | null; days: number }[];
    sharedDays: number;
    crowd: boolean;
};

export function groupSharedIps(
    rows: SharedIpRow[],
    minAccounts = 2,
    crowdAt = 5
): SharedIpGroup[] {
    const byIp = new Map<string, SharedIpRow[]>();

    for (const r of rows) byIp.set(r.ip, [...(byIp.get(r.ip) ?? []), r]);

    const groups: SharedIpGroup[] = [];

    for (const [ip, members] of byIp) {
        if (members.length < minAccounts) continue;

        const perDay = new Map<string, number>();

        for (const m of members)
            for (const d of new Set(m.days))
                perDay.set(d, (perDay.get(d) ?? 0) + 1);

        groups.push({
            ip,
            country: members.find((m) => m.country)?.country ?? null,
            accounts: members.map((m) => ({
                userId: m.userId,
                device: m.device,
                days: new Set(m.days).size,
            })),
            sharedDays: [...perDay.values()].filter((n) => n >= 2).length,
            crowd: members.length >= crowdAt,
        });
    }

    return groups.sort(
        (a, b) =>
            b.accounts.length - a.accounts.length || b.sharedDays - a.sharedDays
    );
}
