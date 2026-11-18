import 'server-only';
import { systemContent } from '@/lib/server/systems/lookup';

type Row = Record<string, unknown>;

/** Adds the module rows registered for the `host` kind to each row; absent or foreign ids give null */
export async function embedRows<T extends Row>(
    host: string,
    campaignId: string,
    rows: readonly T[],
    brief?: true
): Promise<Array<T & Row>> {
    const embeds = Object.values(systemContent('embeds')).filter(
        (e) => e.host === host
    );

    const loaded = await Promise.all(
        embeds.map(async (e) => {
            const ids = [
                ...new Set(
                    rows.flatMap((r) =>
                        typeof r[e.column] === 'string'
                            ? [r[e.column] as string]
                            : []
                    )
                ),
            ];

            const found = ids.length
                ? await e.load({ campaignId, ids, brief })
                : [];

            return { e, byId: new Map(found.map((f) => [f.id, f])) };
        })
    );

    return rows.map((row) => ({
        ...row,
        ...Object.fromEntries(
            loaded.map(({ e, byId }) => [
                e.as,
                byId.get(row[e.column] as string) ?? null,
            ])
        ),
    }));
}
