import type { MentionType } from "@/types/scenario";

export function mentionHref(campaignId: string, type: MentionType, id: string): string {
  if (type === "battle") return `/campaigns/${campaignId}/battles/${id}`;

  const section = { unit: "units", artifact: "artifacts", character: "characters", spell: "spells" }[type];

  return `/campaigns/${campaignId}/dm/${section}/${id}`;
}
