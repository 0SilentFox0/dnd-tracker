import type { Slide } from "@/types/show";

export function removedSlideUrls(before: Pick<Slide, "imageUrl">[], after: Pick<Slide, "imageUrl">[], keep: Iterable<string>): string[] {
  const kept = new Set([...after.map((s) => s.imageUrl), ...keep]);

  return [...new Set(before.map((s) => s.imageUrl))].filter((url) => !kept.has(url));
}
