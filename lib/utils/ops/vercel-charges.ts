export type VercelCharge = {
    EffectiveCost?: string | number;
    ConsumedQuantity?: string | number;
    ConsumedUnit?: string;
    ServiceName?: string;
    SkuName?: string;
    Tags?: { ProjectId?: string };
};

export type VercelUsage = {
    costUsd: number;
    bandwidthBytes: number | null;
    invocations: number | null;
};

const BYTE_UNITS: Record<string, number> = {
    b: 1,
    byte: 1,
    bytes: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
    tb: 1024 ** 4,
};

const COUNT_UNITS: Record<string, number> = {
    '': 1,
    count: 1,
    request: 1,
    requests: 1,
    invocation: 1,
    invocations: 1,
    k: 1e3,
    thousand: 1e3,
    m: 1e6,
    million: 1e6,
};

function unitFactor(table: Record<string, number>, unit?: string): number {
    return table[(unit ?? '').trim().toLowerCase()] ?? Number.NaN;
}

export function parseVercelCharges(
    text: string,
    projectId?: string
): VercelUsage {
    const usage: VercelUsage = {
        costUsd: 0,
        bandwidthBytes: null,
        invocations: null,
    };

    for (const line of text.split('\n')) {
        if (!line.trim()) continue;

        const row = JSON.parse(line) as VercelCharge;

        if (projectId && row.Tags?.ProjectId !== projectId) continue;

        usage.costUsd += Number(row.EffectiveCost) || 0;

        const name =
            `${row.ServiceName ?? ''} ${row.SkuName ?? ''}`.toLowerCase();

        const quantity = Number(row.ConsumedQuantity);

        if (!Number.isFinite(quantity)) continue;

        if (/data transfer|bandwidth/.test(name)) {
            const bytes = quantity * unitFactor(BYTE_UNITS, row.ConsumedUnit);

            if (Number.isFinite(bytes))
                usage.bandwidthBytes = (usage.bandwidthBytes ?? 0) + bytes;
        } else if (/function.*invocation|invocation/.test(name)) {
            const count = quantity * unitFactor(COUNT_UNITS, row.ConsumedUnit);

            if (Number.isFinite(count))
                usage.invocations = (usage.invocations ?? 0) + count;
        }
    }

    return usage;
}
