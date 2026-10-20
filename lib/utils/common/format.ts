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
