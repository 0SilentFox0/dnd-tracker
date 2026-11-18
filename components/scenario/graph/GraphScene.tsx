'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { GraphEdgeLine, SEQUENCE_MARKER_ID } from './GraphEdgeLine';
import { GraphNodeShape } from './GraphNodeShape';

import { GRAPH_TYPE_STYLE } from '@/lib/constants/scenario-graph';
import { pickLabels } from '@/lib/utils/scenario/graph/labels';
import type {
    PositionedGraph,
    PositionedNode,
} from '@/lib/utils/scenario/graph/layout';
import type { Box } from '@/lib/utils/scenario/graph/viewport';

export interface GraphSceneView {
    selection: { nodes: ReadonlySet<string>; edges: ReadonlySet<string> };
    selectedId: string | null;
    showSequence: boolean;
    matched: ReadonlySet<string>;
}

export interface GraphSceneActions {
    onSelect: (id: string) => void;
    onClear: () => void;
    onOpen: (node: PositionedNode) => void;
}

const GOLD = 'var(--color-hud-gold-bright)';

export function GraphScene({
    graph,
    byId,
    box,
    view,
    actions,
}: {
    graph: PositionedGraph;
    byId: ReadonlyMap<string, PositionedNode>;
    box: Box;
    view: GraphSceneView;
    actions: GraphSceneActions;
}) {
    const t = useTranslations('scenarioGraph');

    const { selection, selectedId, showSequence, matched } = view;

    const { onSelect, onClear, onOpen } = actions;

    const [hoverId, setHoverId] = useState<string | null>(null);

    const nodeActions = useMemo(
        () => ({ onHover: setHoverId, onSelect, onClear, onOpen }),
        [onSelect, onClear, onOpen]
    );

    const hoverEdges = useMemo(() => {
        if (!hoverId) return null;

        const edges = new Set<string>();

        const nodes = new Set([hoverId]);

        for (const e of graph.edges) {
            if (e.source !== hoverId && e.target !== hoverId) continue;

            edges.add(e.id);
            nodes.add(e.source);
            nodes.add(e.target);
        }

        return { edges, nodes };
    }, [hoverId, graph.edges]);

    const labelled = useMemo(
        () =>
            pickLabels(graph.nodes, new Set([...selection.nodes, ...matched])),
        [graph.nodes, selection.nodes, matched]
    );

    const active = selectedId
        ? selection
        : (hoverEdges ?? {
              edges: new Set<string>(),
              nodes: new Set<string>(),
          });

    return (
        <>
            <defs>
                <pattern
                    id="graph-dots"
                    width={36}
                    height={36}
                    patternUnits="userSpaceOnUse"
                >
                    <circle
                        cx={2}
                        cy={2}
                        r={1.3}
                        fill="var(--muted-foreground)"
                        opacity={0.28}
                    />
                </pattern>
                <marker
                    id={SEQUENCE_MARKER_ID}
                    viewBox="0 0 10 10"
                    refX={8}
                    refY={5}
                    markerWidth={18}
                    markerHeight={18}
                    markerUnits="userSpaceOnUse"
                    orient="auto"
                >
                    <path
                        d="M2 1.5 L8 5 L2 8.5"
                        fill="none"
                        stroke={GOLD}
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </marker>
            </defs>
            <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                fill="url(#graph-dots)"
                pointerEvents="none"
            />
            <g>
                {showSequence
                    ? graph.sequence.map((edge) => {
                          const from = byId.get(edge.source);

                          const to = byId.get(edge.target);

                          if (!from || !to) return null;

                          return (
                              <GraphEdgeLine
                                  key={edge.id}
                                  edge={edge}
                                  from={from}
                                  to={to}
                                  color={GOLD}
                                  kind="sequence"
                                  emphasis={
                                      selectedId &&
                                      !selection.nodes.has(edge.source) &&
                                      !selection.nodes.has(edge.target)
                                          ? 'dimmed'
                                          : undefined
                                  }
                                  secretLabel=""
                              />
                          );
                      })
                    : null}
                {graph.relations.map((edge) => {
                    const from = byId.get(edge.source);

                    const to = byId.get(edge.target);

                    if (!from || !to) return null;

                    const touched = selection.edges.has(edge.id);

                    return (
                        <GraphEdgeLine
                            key={edge.id}
                            edge={edge}
                            from={from}
                            to={to}
                            color={GOLD}
                            kind="relation"
                            emphasis={
                                selectedId && !touched
                                    ? 'dimmed'
                                    : touched
                                      ? 'highlighted'
                                      : undefined
                            }
                            secretLabel=""
                        />
                    );
                })}
                {graph.edges.map((edge) => {
                    const from = byId.get(edge.source);

                    const to = byId.get(edge.target);

                    if (!from || !to) return null;

                    return (
                        <GraphEdgeLine
                            key={edge.id}
                            edge={edge}
                            from={from}
                            to={to}
                            color={
                                to.type
                                    ? GRAPH_TYPE_STYLE[to.type].color
                                    : 'currentColor'
                            }
                            emphasis={
                                selectedId && !selection.edges.has(edge.id)
                                    ? 'dimmed'
                                    : active.edges.has(edge.id)
                                      ? 'highlighted'
                                      : undefined
                            }
                            secretLabel={t('graph.secretEdge')}
                        />
                    );
                })}
                {graph.nodes.map((node) => (
                    <GraphNodeShape
                        key={node.id}
                        node={node}
                        selected={node.id === selectedId}
                        dimmed={!!selectedId && !selection.nodes.has(node.id)}
                        matched={matched.has(node.id)}
                        hovered={node.id === hoverId}
                        labelled={labelled.has(node.id)}
                        actions={nodeActions}
                    />
                ))}
            </g>
        </>
    );
}
