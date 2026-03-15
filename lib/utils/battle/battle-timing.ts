/**
 * Утиліти для логування часу виконання дій у сцені бою.
 * Увімкнути: BATTLE_TURN_TIMING=1 або NODE_ENV=development
 * На клієнті: NEXT_PUBLIC_BATTLE_TURN_TIMING=1
 */

function getIsTimingEnabled(): boolean {
  if (typeof process === "undefined") return false;

  return (
    process.env.NODE_ENV === "development" ||
    process.env.BATTLE_TURN_TIMING === "1" ||
    process.env.NEXT_PUBLIC_BATTLE_TURN_TIMING === "1"
  );
}

export function isBattleTimingEnabled(): boolean {
  return getIsTimingEnabled();
}

export function logBattleTiming(
  _label?: string,
  _startMs?: number,
  _extra?: Record<string, number | string | null>,
) {
  void _label;
  void _startMs;
  void _extra;
  // Логування вимкнено
}

/** Вимірює виконання функції і логує час */
export function measureTiming<T>(
  label: string,
  fn: () => T,
  extra?: Record<string, number | string | null>,
): T {
  const start = Date.now();

  try {
    return fn();
  } finally {
    logBattleTiming(label, start, extra);
  }
}
