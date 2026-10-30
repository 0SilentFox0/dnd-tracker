import { MENTION_TYPES } from "@/lib/constants/scenario";
import { matchesQuery } from "@/lib/utils/common/text-search";
import { entityNodeId, sceneNodeId } from "@/lib/utils/scenario/graph/model";
import type { GraphFilters } from "@/lib/utils/scenario/graph/types";
import type { MentionType, ScenarioIndex, ScenarioPageKind } from "@/types/scenario";

export interface GraphListItem {
  id: string;
  kind: "scene" | "entity";
  type?: MentionType;
  pageKind?: ScenarioPageKind;
  label: string;
  degree: number;
  mentions: number;
  missing: boolean;
}

export interface GraphListGroup {
  key: "scenes" | MentionType;
  items: GraphListItem[];
}

export function buildGraphList(index: ScenarioIndex, filters: GraphFilters, query: string): GraphListGroup[] {
  const mentions = new Map<string, number>();

  for (const e of index.edges) {
    for (const id of [sceneNodeId(e.sceneId), entityNodeId(e.entityType, e.entityId)]) mentions.set(id, (mentions.get(id) ?? 0) + e.count);
  }

  const entities = index.entities.filter((e) => filters.types.has(e.type) && (!filters.onlyMissing || e.missing) && matchesQuery([e.label], query));

  const linked = new Set(index.entities.filter((e) => e.missing).flatMap((e) => e.sceneIds));

  const scenes = index.scenes
    .filter((s) => (!filters.onlyMissing || linked.has(s.id)) && matchesQuery([s.title], query))
    .sort((a, b) => a.order - b.order)
    .map<GraphListItem>((s) => ({ id: sceneNodeId(s.id), kind: "scene", pageKind: s.pageKind, label: s.title, degree: index.edges.filter((e) => e.sceneId === s.id).length, mentions: mentions.get(sceneNodeId(s.id)) ?? 0, missing: false }));

  const groups: GraphListGroup[] = [{ key: "scenes", items: scenes }];

  for (const type of MENTION_TYPES) {
    const items = entities
      .filter((e) => e.type === type)
      .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
      .map<GraphListItem>((e) => ({ id: entityNodeId(e.type, e.id), kind: "entity", type: e.type, label: e.label, degree: e.degree, mentions: mentions.get(entityNodeId(e.type, e.id)) ?? 0, missing: e.missing }));

    groups.push({ key: type, items });
  }

  return groups.filter((g) => g.items.length > 0);
}
