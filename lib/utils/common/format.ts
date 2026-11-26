export function signed(n: number): string {
    return n >= 0 ? `+${n}` : `${n}`;
}

export function signedDelta(n: number): string {
    return n >= 0 ? `+${n}` : `−${-n}`;
}

export function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

export function mult(n: number): string {
    return `×${Math.round(n * 100) / 100}`;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function scaled(value: number, step: number, units: string[]): string {
    let v = Math.abs(value);

    let i = 0;

    while (v >= step && i < units.length - 1) {
        v /= step;
        i++;
    }

    const digits = v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2;

    return `${value < 0 ? '-' : ''}${Number(v.toFixed(digits))}${units[i]}`;
}

export function formatBytes(value: number): string {
    return scaled(value, 1024, BYTE_UNITS);
}
