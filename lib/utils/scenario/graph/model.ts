import { MENTION_TYPES } from '@/lib/constants/scenario';
import { GRAPH_ENTITY_CAP } from '@/lib/constants/scenario-graph';
import { matchesQuery } from '@/lib/utils/common/text-search';
import type {
    GraphEdge,
    GraphFilters,
    GraphModel,
    GraphNode,
} from '@/lib/utils/scenario/graph/types';
import { relationPairKey } from '@/lib/utils/scenario/index/build';
import type { MentionType, ScenarioIndex } from '@/types/scenario';

export const sceneNodeId = (id: string) => `scene:${id}`;
export const entityNodeId = (type: MentionType, id: string) => `${type}:${id}`;

export const defaultFilters = (): GraphFilters => ({
    types: new Set(MENTION_TYPES),
    showAll: false,
    showLeaves: false,
    onlyMissing: false,
});

export function buildGraphModel(
    index: ScenarioIndex,
    filters: GraphFilters,
    cap = GRAPH_ENTITY_CAP,
    forceInclude: ReadonlySet<string> = new Set()
): GraphModel {
    const candidates = index.entities.filter(
        (e) => filters.types.has(e.type) && (!filters.onlyMissing || e.missing)
    );

    const related = new Set(index.relations.flatMap((r) => [r.a, r.b]));

    const forced = (e: (typeof candidates)[number]) => {
        const id = entityNodeId(e.type, e.id);

        return forceInclude.has(id) || related.has(id);
    };

    const isLeaf = (e: (typeof candidates)[number]) =>
        e.degree === 1 && !e.missing && !filters.showLeaves && !forced(e);

    const collapsed = candidates.filter(isLeaf);

    const rest = candidates.filter((e) => !isLeaf(e));

    let free = cap;

    const kept = filters.showAll
        ? rest
        : rest.filter((e) => {
              if (forced(e)) return true;

              return free-- > 0;
          });

    const truncated = rest.length - kept.length;

    const hiddenByScene = new Map<string, number>();

    for (const leaf of collapsed) {
        const sceneId = leaf.sceneIds[0];

        if (sceneId)
            hiddenByScene.set(sceneId, (hiddenByScene.get(sceneId) ?? 0) + 1);
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

        edges.push({
            id: `${e.sceneId}>${e.entityType}:${e.entityId}`,
            source,
            target,
            count: e.count,
            secret: e.secret,
        });
        linkedScenes.add(source);
        bump(source);
        bump(target);
    }

    const sceneNodes: GraphNode[] = index.scenes
        .filter(
            (s) => !filters.onlyMissing || linkedScenes.has(sceneNodeId(s.id))
        )
        .map((s) => ({
            id: sceneNodeId(s.id),
            kind: 'scene',
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
        kind: 'entity',
        type: e.type,
        label: e.label,
        degree: degree.get(entityNodeId(e.type, e.id)) ?? 0,
        missing: e.missing,
        refId: e.id,
        hidden: 0,
        image: e.image ?? null,
    }));

    const sequence: GraphEdge[] = [];

    const mainScenes = sceneNodes
        .filter((n) => n.pageKind === 'scene')
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    mainScenes.forEach((n, i) => {
        const prev = mainScenes[i - 1];

        if (prev)
            sequence.push({
                id: `seq:${prev.refId}>${n.refId}`,
                source: prev.id,
                target: n.id,
                count: 1,
                secret: false,
            });
    });

    const merged = new Map<
        string,
        { a: string; b: string; labels: string[] }
    >();

    for (const r of index.relations) {
        if (!keptIds.has(r.a) || !keptIds.has(r.b)) continue;

        const key = relationPairKey(r.a, r.b);

        const entry = merged.get(key) ?? {
            a: r.a < r.b ? r.a : r.b,
            b: r.a < r.b ? r.b : r.a,
            labels: [],
        };

        if (r.label && !entry.labels.includes(r.label))
            entry.labels.push(r.label);

        merged.set(key, entry);
    }

    const relations: GraphEdge[] = [...merged.entries()].map(([key, r]) => ({
        id: `rel:${key}`,
        source: r.a,
        target: r.b,
        count: 1,
        secret: false,
        label: r.labels.join('; '),
    }));

    return {
        nodes: [...sceneNodes, ...entityNodes],
        edges,
        sequence,
        relations,
        truncated,
        entityTotal: candidates.length,
    };
}

export function neighbors(
    model: GraphModel,
    nodeId: string
): { nodes: Set<string>; edges: Set<string> } {
    const nodes = new Set([nodeId]);

    const edges = new Set<string>();

    for (const e of model.edges) {
        if (e.source !== nodeId && e.target !== nodeId) continue;

        edges.add(e.id);
        nodes.add(e.source);
        nodes.add(e.target);
    }

    for (const r of model.relations) {
        if (r.source !== nodeId && r.target !== nodeId) continue;

        edges.add(r.id);
        nodes.add(r.source);
        nodes.add(r.target);
    }

    return { nodes, edges };
}

export function searchMatches(model: GraphModel, query: string): string[] {
    if (!query.trim()) return [];

    return model.nodes
        .filter((n) => matchesQuery([n.label], query))
        .map((n) => n.id);
}

export function egoModel(model: GraphModel, nodeId: string): GraphModel {
    if (!model.nodes.some((n) => n.id === nodeId)) return model;

    const keep = new Set(neighbors(model, nodeId).nodes);

    for (const e of model.sequence) {
        if (e.source === nodeId) keep.add(e.target);
        else if (e.target === nodeId) keep.add(e.source);
    }

    return {
        ...model,
        nodes: model.nodes.filter((n) => keep.has(n.id)),
        edges: model.edges.filter(
            (e) => keep.has(e.source) && keep.has(e.target)
        ),
        sequence: model.sequence.filter(
            (e) => keep.has(e.source) && keep.has(e.target)
        ),
        relations: model.relations.filter(
            (e) => keep.has(e.source) && keep.has(e.target)
        ),
    };
}
