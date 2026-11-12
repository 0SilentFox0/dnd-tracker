export type SystemData = Record<string, unknown>;

export interface SystemSlot {
    key: string;
    data: unknown;
}

export interface SlotCodec<T> {
    key: string;
    read(slot: SystemSlot | undefined | null): T | undefined;
    write(data: T, prev?: SystemSlot | null): SystemSlot;
    extend<E>(
        module: string,
        parse: (raw: unknown) => E | undefined
    ): SlotCodec<E>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

const prevData = (
    key: string,
    prev: SystemSlot | undefined | null
): Record<string, unknown> =>
    prev?.key === key && isRecord(prev.data) ? prev.data : {};

export const systemSlotOf = (
    slot: SystemSlot | undefined
): { system?: SystemSlot } => (slot ? { system: slot } : {});

export const defineSlot = <T>(
    key: string,
    parse: (raw: unknown) => T | undefined
): SlotCodec<T> => {
    const codec: SlotCodec<T> = {
        key,
        read: (slot) => (slot?.key === key ? parse(slot.data) : undefined),
        write: (data, prev) => {
            const ext = prevData(key, prev).ext;

            if (ext === undefined || !isRecord(data) || 'ext' in data)
                return { key, data };

            return { key, data: { ...data, ext } };
        },
        extend: <E>(
            module: string,
            parseExt: (raw: unknown) => E | undefined
        ): SlotCodec<E> => {
            const sub: SlotCodec<E> = {
                key,
                read: (slot) => {
                    if (
                        slot?.key !== key ||
                        !isRecord(slot.data) ||
                        !isRecord(slot.data.ext)
                    )
                        return undefined;

                    return parseExt(slot.data.ext[module]);
                },
                write: (data, prev) => {
                    const base = prevData(key, prev);

                    const ext = isRecord(base.ext) ? base.ext : {};

                    return {
                        key,
                        data: { ...base, ext: { ...ext, [module]: data } },
                    };
                },
                extend: codec.extend,
            };

            return sub;
        },
    };

    return codec;
};
