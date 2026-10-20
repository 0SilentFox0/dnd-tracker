import type { ShowState } from "@/types/show";

export function mergeShow(cached: ShowState | null, incoming: ShowState | null | undefined): ShowState | null {
  if (!incoming) return cached;

  return !cached || incoming.seq > cached.seq ? incoming : cached;
}
