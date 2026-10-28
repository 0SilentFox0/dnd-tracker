export function choiceSlug(text: string, taken: readonly string[] = []): string {
  const base =
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "choice";

  if (!taken.includes(base)) return base;

  let n = 2;

  while (taken.includes(`${base}-${n}`)) n += 1;

  return `${base}-${n}`;
}
