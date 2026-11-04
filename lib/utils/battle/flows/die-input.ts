/**
 * Значення кубика з поля вводу: порожньо → undefined (очистити), інакше перше валідне з усього числа,
 * останніх двох і останньої цифри — дописана до старого значення цифра замінює його. null — ігнорувати.
 * strict: лише ціле число без обрізання хвоста (поле d100).
 */
export function parseDieInput(raw: string, sides: number, strict = false): number | undefined | null {
  const digits = raw.replace(/\D/g, "");

  if (digits === "") return undefined;

  const candidates = strict ? [digits] : [digits, digits.slice(-2), digits.slice(-1)];

  for (const candidate of candidates) {
    const n = parseInt(candidate, 10);

    if (n >= 1 && n <= sides) return n;
  }

  return null;
}
