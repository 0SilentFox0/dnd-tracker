import { getCachedClasses } from "@/lib/cache/reference-data";
import type { CampaignSpellContext } from "@/lib/utils/battle/types/participant";
import { classesById } from "@/lib/utils/characters/classes";
import { toGameClassData } from "@/lib/utils/characters/classes/row";
import type { GameClassData } from "@/types/classes";

export async function loadClassesById(campaignId: string, context?: CampaignSpellContext): Promise<Record<string, GameClassData>> {
  if (context?.classesById) return context.classesById;

  return classesById((await getCachedClasses(campaignId)).map(toGameClassData));
}
