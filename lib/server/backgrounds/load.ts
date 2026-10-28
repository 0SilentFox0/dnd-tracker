import "server-only";
import { getCachedBackgrounds } from "@/lib/cache/reference-data";
import { toBackgroundData } from "@/lib/utils/backgrounds/row";
import type { BackgroundData } from "@/types/backgrounds";

export async function loadBackground(campaignId: string, id: string | null | undefined): Promise<BackgroundData | null> {
  if (!id) return null;

  const row = (await getCachedBackgrounds(campaignId)).find((b) => b.id === id);

  return row ? toBackgroundData(row) : null;
}
