"use client";

import { useCallback, useMemo, useState } from "react";

import { useScenarioIndex } from "./useScenarioIndex";

import { GRAPH_WARN_NODES } from "@/lib/constants/scenario-graph";
import { layoutGraph } from "@/lib/utils/scenario/graph/layout";
import { buildGraphModel, defaultFilters, neighbors, searchMatches } from "@/lib/utils/scenario/graph/model";
import type { GraphDetail, GraphFilters } from "@/lib/utils/scenario/graph/types";

const NO_SELECTION = { nodes: new Set<string>(), edges: new Set<string>() };

export function useScenarioGraph(campaignId: string) {
  const { data: index, isLoading, isError } = useScenarioIndex(campaignId);

  const [filters, setFilters] = useState<GraphFilters>(defaultFilters);

  const [query, setQueryState] = useState("");

  const [matchIndex, setMatchIndex] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const model = useMemo(() => (index ? buildGraphModel(index, filters) : null), [index, filters]);

  const graph = useMemo(() => (model ? layoutGraph(model) : null), [model]);

  const matches = useMemo(() => (model ? searchMatches(model, query) : []), [model, query]);

  const selection = useMemo(() => {
    const node = graph?.nodes.find((n) => n.id === selectedId);

    if (!model || !graph || !node) return { ...NO_SELECTION, detail: null as GraphDetail | null };

    const hood = neighbors(model, node.id);

    const byId = new Map(graph.nodes.map((n) => [n.id, n]));

    const links = model.edges.flatMap((e) => {
      const other = byId.get(e.source === node.id ? e.target : e.source);

      return (e.source === node.id || e.target === node.id) && other ? [{ node: other, count: e.count, secret: e.secret }] : [];
    });

    return { ...hood, detail: { node, links } as GraphDetail | null };
  }, [model, graph, selectedId]);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setMatchIndex(0);
  }, []);

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;

    const current = matchIndex % matches.length;

    const next = matches[current] === selectedId ? (current + 1) % matches.length : current;

    setMatchIndex(next);
    setSelectedId(matches[next] ?? null);
  }, [matches, matchIndex, selectedId]);

  const patchFilters = useCallback((patch: Partial<GraphFilters>) => setFilters((f) => ({ ...f, ...patch })), []);

  return {
    state: {
      isLoading,
      isError,
      isEmpty: !!index && index.scenes.length === 0,
      graph,
      filters,
      query,
      selectedId,
      matches,
      matchIndex,
      truncated: model?.truncated ?? 0,
      overLimit: (model?.nodes.length ?? 0) > GRAPH_WARN_NODES,
      counts: index?.counts ?? null,
    },
    set: { filters: patchFilters, query: setQuery, selected: setSelectedId, nextMatch },
    selection,
  };
}
