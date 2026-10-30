import { MENTION_TYPES } from "@/lib/constants/scenario";
import { GRAPH_ENTITY_CAP } from "@/lib/constants/scenario-graph";
import { matchesQuery } from "@/lib/utils/common/text-search";
import type { GraphEdge, GraphFilters, GraphModel, GraphNode } from "@/lib/utils/scenario/graph/types";
import type { MentionType, ScenarioIndex } from "@/types/scenario";

export const sceneNodeId = (id: string) => `scene:${id}`;
export const entityNodeId = (type: MentionType, id: string) => `${type}:${id}`;

export const defaultFilters = (): GraphFilters => ({
  types: new Set(MENTION_TYPES),
  showAll: false,
  showLeaves: false,
  onlyMissing: false,
});

export function buildGraphModel(index: ScenarioIndex, filters: GraphFilters, cap = GRAPH_ENTITY_CAP): GraphModel {
  const candidates = index.entities.filter((e) => filters.types.has(e.type) && (!filters.onlyMissing || e.missing));

  const isLeaf = (e: (typeof candidates)[number]) => e.degree === 1 && !e.missing && !filters.showLeaves;

  const collapsed = candidates.filter(isLeaf);

  const rest = candidates.filter((e) => !isLeaf(e));

  const kept = filters.showAll ? rest : rest.slice(0, cap);

  const truncated = rest.length - kept.length;

  const hiddenByScene = new Map<string, number>();

  for (const leaf of collapsed) {
    const sceneId = leaf.sceneIds[0];

    if (sceneId) hiddenByScene.set(sceneId, (hiddenByScene.get(sceneId) ?? 0) + 1);
  }

  const keptIds = new Set(kept.map((e) => entityNodeId(e.type, e.id)));

  const edges: GraphEdge[] = [];

  const linkedScenes = new Set<string>();

  const degree = new Map<string, number>();

  const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);

  for (const e of index.edges) {
    const target = entityNodeId(e.entityType, e.entityId);

    if (!keptIds.has(target)) continue;

    const source = sceneNodeId(e.sceneId);

    edges.push({ id: `${e.sceneId}>${e.entityType}:${e.entityId}`, source, target, count: e.count, secret: e.secret });
    linkedScenes.add(source);
    bump(source);
    bump(target);
  }

  const sceneNodes: GraphNode[] = index.scenes
    .filter((s) => !filters.onlyMissing || linkedScenes.has(sceneNodeId(s.id)))
    .map((s) => ({
      id: sceneNodeId(s.id),
      kind: "scene",
      pageKind: s.pageKind,
      label: s.title,
      degree: degree.get(sceneNodeId(s.id)) ?? 0,
      missing: false,
      status: s.status,
      order: s.order,
      refId: s.id,
      hidden: hiddenByScene.get(s.id) ?? 0,
    }));

  const entityNodes: GraphNode[] = kept.map((e) => ({
    id: entityNodeId(e.type, e.id),
    kind: "entity",
    type: e.type,
    label: e.label,
    degree: degree.get(entityNodeId(e.type, e.id)) ?? 0,
    missing: e.missing,
    refId: e.id,
    hidden: 0,
  }));

  return { nodes: [...sceneNodes, ...entityNodes], edges, truncated };
}

export function neighbors(model: GraphModel, nodeId: string): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set([nodeId]);

  const edges = new Set<string>();

  for (const e of model.edges) {
    if (e.source !== nodeId && e.target !== nodeId) continue;

    edges.add(e.id);
    nodes.add(e.source);
    nodes.add(e.target);
  }

  return { nodes, edges };
}

export function searchMatches(model: GraphModel, query: string): string[] {
  if (!query.trim()) return [];

  return model.nodes.filter((n) => matchesQuery([n.label], query)).map((n) => n.id);
}
