/**
 * Утиліти для логування часу виконання дій у сцені бою.
 */

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
