/**
 * Перевіряє, чи рядок виглядає як URL зображення для next/image.
 * Якщо в БД збережено емодзі або текст замість URL — next/image падає з ERR_INVALID_URL.
 */
export function isValidImageSrc(src: string | null | undefined): src is string {
  if (!src || typeof src !== "string") return false;

  const t = src.trim();

  return (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("/")
  );
}
