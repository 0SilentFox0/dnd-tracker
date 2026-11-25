export interface TargetBatch<T extends { id: string }> {
    batch: T[];
    next?: string;
}

/** One bounded slice of the resolved targets; `next` is the last id handled, to continue after it. */
export function sliceTargets<T extends { id: string }>(
    targets: T[],
    after: string | undefined,
    size: number
): TargetBatch<T> {
    const start = after ? targets.findIndex((t) => t.id === after) + 1 : 0;

    const batch = targets.slice(start, start + size);

    const more = start + batch.length < targets.length;

    return more ? { batch, next: batch[batch.length - 1].id } : { batch };
}
