import type { GraphNode } from "@/lib/utils/scenario/graph/types";
import { mentionHref } from "@/lib/utils/scenario/mention-href";

export function graphNodeHref(campaignId: string, node: Pick<GraphNode, "kind" | "type" | "refId" | "missing">): string | null {
  if (node.kind === "scene") return `/campaigns/${campaignId}/dm/scenario/${node.refId}`;

  if (node.missing || !node.type) return null;

  return mentionHref(campaignId, node.type, node.refId);
}
