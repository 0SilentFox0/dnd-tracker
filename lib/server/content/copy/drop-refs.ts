import { isRecord } from '@/lib/utils/common/is-record';
import { parseItemRef } from '@/lib/utils/items/ref';

const DROPPED = Symbol('dropped');

const isDropped = (s: string, drop: ReadonlySet<string>) => {
    if (drop.has(s)) return true;

    const ref = parseItemRef(s);

    return !!ref && (drop.has(ref.baseId) || drop.has(ref.propertyId ?? ''));
};

function strip(value: unknown, drop: ReadonlySet<string>): unknown {
    if (typeof value === 'string') return isDropped(value, drop) ? DROPPED : value;

    if (Array.isArray(value))
        return value.map((v) => strip(v, drop)).filter((v) => v !== DROPPED);

    if (isRecord(value) && !(value instanceof Date))
        return Object.fromEntries(
            Object.entries(value)
                .filter(([k]) => !drop.has(k))
                .map(([k, v]) => {
                    const s = strip(v, drop);

                    return [k, s === DROPPED ? null : s];
                })
        );

    return value;
}

/** Nulls FK columns / JSON values pointing at dropped ids and removes them from lists and map keys. */
export function dropRefs<T extends Record<string, unknown>>(
    row: T,
    drop: ReadonlySet<string>
): T {
    const { id, ...rest } = row;

    return { id, ...(strip(rest, drop) as object) } as unknown as T;
}
