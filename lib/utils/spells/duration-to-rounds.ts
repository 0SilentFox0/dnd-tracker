/**
 * Convert spell duration string to number of rounds.
 * 1 round = all participants have taken one turn.
 */

export function parseDurationToRounds(
  duration: string | null | undefined
): number {
  if (duration == null || typeof duration !== "string") return 0;

  const s = duration.trim().toLowerCase();

  if (!s || s === "instantaneous") return 0;

  const roundsMatch = s.match(/^(\d+)\s*rounds?$/i);

  if (roundsMatch) return Math.max(0, parseInt(roundsMatch[1], 10));

  const minuteMatch = s.match(/^(\d+)\s*minute/i);

  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1], 10);

    return minutes * 10;
  }

  const hourMatch = s.match(/^(\d+)\s*hour/i);

  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);

    return hours * 60;
  }

  if (s.includes("minute")) {
    const n = s.match(/(\d+)/)?.[1];

    if (n) return parseInt(n, 10) * 10;
  }

  if (s.includes("hour")) {
    const n = s.match(/(\d+)/)?.[1];

    if (n) return parseInt(n, 10) * 60;
  }

  return 0;
}
