/**
 * Значення кубика з поля вводу: порожньо → undefined (очистити), інакше перше валідне з усього числа,
 * останніх двох і останньої цифри — дописана до старого значення цифра замінює його. null — ігнорувати.
 */
export function parseDieInput(raw: string, sides: number): number | undefined | null {
  const digits = raw.replace(/\D/g, "");

  if (digits === "") return undefined;

  for (const candidate of [digits, digits.slice(-2), digits.slice(-1)]) {
    const n = parseInt(candidate, 10);

    if (n >= 1 && n <= sides) return n;
  }

  return null;
}
