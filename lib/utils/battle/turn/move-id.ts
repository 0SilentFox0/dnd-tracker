export function moveId(order: string[], id: string, toIndex: number): string[] {
    const from = order.indexOf(id);

    if (from === -1) return order;

    const to = Math.max(0, Math.min(order.length - 1, toIndex));

    if (to === from) return order;

    const next = order.filter((x) => x !== id);

    next.splice(to, 0, id);

    return next;
}
