import type { IndexEdge, IndexEntityNode, IndexSceneNode, MentionType, PageFacts, ScenarioIndex, ScenarioPageSummary } from "@/types/scenario";

export const entityKey = (type: MentionType, id: string) => `${type}:${id}`;

interface BuildInput {
  pages: ScenarioPageSummary[];
  facts: Map<string, PageFacts>;
  resolved: Map<string, { label: string; image?: string | null }>;
}

interface EntityAcc {
  type: MentionType;
  id: string;
  label: string;
  sceneIds: string[];
}

const byOrder = (a: ScenarioPageSummary, b: ScenarioPageSummary) =>
  a.sortOrder - b.sortOrder || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);

export function buildScenarioIndex({ pages, facts, resolved }: BuildInput): ScenarioIndex {
  const ordered = [...pages].sort(byOrder);

  const scenes: IndexSceneNode[] = [];

  const edges: IndexEdge[] = [];

  const entities = new Map<string, EntityAcc>();

  ordered.forEach((page, order) => {
    const pageFacts = facts.get(page.id);

    scenes.push({
      kind: "scene",
      id: page.id,
      title: page.title,
      pageKind: page.kind,
      status: page.status,
      order,
      sections: (pageFacts?.sections ?? []).map(({ id, title, played }) => ({ id, title, played })),
    });

    const sceneEdges = new Map<string, IndexEdge>();

    for (const section of pageFacts?.sections ?? []) {
      for (const ref of section.refs) {
        const key = entityKey(ref.type, ref.id);

        const edge = sceneEdges.get(key);

        if (edge) {
          edge.count += ref.count;
          edge.sectionIds.push(section.id);
          edge.secret = edge.secret && ref.secret;
        } else {
          sceneEdges.set(key, { sceneId: page.id, entityType: ref.type, entityId: ref.id, count: ref.count, sectionIds: [section.id], secret: ref.secret });
        }

        const entity = entities.get(key) ?? { type: ref.type, id: ref.id, label: "", sceneIds: [] };

        if (!entity.label) entity.label = ref.label;

        if (!entity.sceneIds.includes(page.id)) entity.sceneIds.push(page.id);

        entities.set(key, entity);
      }
    }

    edges.push(...sceneEdges.values());
  });

  const nodes: IndexEntityNode[] = [...entities.entries()]
    .map(([key, entity]) => {
      const live = resolved.get(key);

      return { kind: "entity" as const, type: entity.type, id: entity.id, label: live?.label ?? entity.label, degree: entity.sceneIds.length, sceneIds: entity.sceneIds, missing: !live, image: live?.image ?? null };
    })
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));

  const byType: ScenarioIndex["counts"]["byType"] = {};

  for (const node of nodes) byType[node.type] = (byType[node.type] ?? 0) + 1;

  return {
    scenes,
    entities: nodes,
    edges,
    counts: { scenes: scenes.length, entities: nodes.length, edges: edges.length, byType, missing: nodes.filter((n) => n.missing).length },
  };
}
