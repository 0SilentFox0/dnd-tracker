export function clockOffsetFromDate(
    dateHeader: string | null,
    sentAt: number,
    receivedAt: number
): number | null {
    if (!dateHeader) return null;

    const server = Date.parse(dateHeader);

    if (!Number.isFinite(server)) return null;

    return server + 500 - (sentAt + receivedAt) / 2;
}
