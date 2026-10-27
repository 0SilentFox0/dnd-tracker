export const normalizeSearchText = (text: string) => text.toLocaleLowerCase("uk").replace(/[’ʼ`]/g, "'").replace(/\s+/g, " ").trim();

export function matchesQuery(texts: (string | null | undefined)[], query: string): boolean {
  const q = normalizeSearchText(query);

  return !q || texts.some((text) => !!text && normalizeSearchText(text).includes(q));
}
