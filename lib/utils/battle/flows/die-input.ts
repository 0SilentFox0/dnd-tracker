export function parseDieInput(
    raw: string,
    sides: number,
    strict = false
): number | undefined | null {
    const digits = raw.replace(/\D/g, '');

    if (digits === '') return undefined;

    const candidates = strict
        ? [digits]
        : [digits, digits.slice(-2), digits.slice(-1)];

    for (const candidate of candidates) {
        const n = parseInt(candidate, 10);

        if (n >= 1 && n <= sides) return n;
    }

    return null;
}
