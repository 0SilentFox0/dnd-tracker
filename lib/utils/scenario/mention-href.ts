import type { MentionType } from "@/types/scenario";

export function mentionHref(campaignId: string, type: MentionType, id: string): string {
  if (type === "battle") return `/campaigns/${campaignId}/battles/${id}`;

  if (type === "marker") return `/campaigns/${campaignId}/dm/world?marker=${id}`;

  const section = { unit: "units", artifact: "artifacts", character: "characters", spell: "spells" }[type];

  return `/campaigns/${campaignId}/dm/${section}/${id}`;
}
