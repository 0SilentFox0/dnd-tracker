"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { useScenarioIndex } from "./useScenarioIndex";

import { GRAPH_WARN_NODES } from "@/lib/constants/scenario-graph";
import { matchesQuery } from "@/lib/utils/common/text-search";
import { type GraphLayoutMode, layoutGraph } from "@/lib/utils/scenario/graph/layout";
import { buildGraphList } from "@/lib/utils/scenario/graph/list";
import { buildGraphModel, defaultFilters, egoModel, entityNodeId, neighbors, searchMatches } from "@/lib/utils/scenario/graph/model";
import type { GraphDetail, GraphFilters } from "@/lib/utils/scenario/graph/types";

const NO_SELECTION = { nodes: new Set<string>(), edges: new Set<string>() };

export function useScenarioGraph(campaignId: string) {
  const { data: index, isLoading, isError, refetch } = useScenarioIndex(campaignId);

  const [filters, setFilters] = useState<GraphFilters>(defaultFilters);

  const [query, setQueryState] = useState("");

  const [matchIndex, setMatchIndex] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);

  const [showSequence, setShowSequence] = useState(true);

  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>("free");

  const [egoId, setEgoId] = useState<string | null>(null);

  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());

  const [autoFor, setAutoFor] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);

  const forcedKey = useMemo(() => {
    if (!index || !deferredQuery.trim()) return "";

    return index.entities
      .filter((e) => matchesQuery([e.label], deferredQuery))
      .map((e) => entityNodeId(e.type, e.id))
      .join("\n");
  }, [index, deferredQuery]);

  const forced = useMemo(() => new Set([...(forcedKey ? forcedKey.split("\n") : []), ...picked]), [forcedKey, picked]);

  const model = useMemo(() => (index ? buildGraphModel(index, filters, undefined, forced) : null), [index, filters, forced]);

  const viewModel = useMemo(() => (model && egoId ? egoModel(model, egoId) : model), [model, egoId]);

  const graph = useMemo(() => (viewModel ? layoutGraph(viewModel, 1, layoutMode) : null), [viewModel, layoutMode]);

  const matches = useMemo(() => (viewModel ? searchMatches(viewModel, deferredQuery) : []), [viewModel, deferredQuery]);

  const list = useMemo(() => (index ? buildGraphList(index, filters, deferredQuery) : []), [index, filters, deferredQuery]);

  const selection = useMemo(() => {
    const node = graph?.nodes.find((n) => n.id === selectedId);

    if (!viewModel || !graph || !node) return { ...NO_SELECTION, detail: null as GraphDetail | null };

    const hood = neighbors(viewModel, node.id);

    const byId = new Map(graph.nodes.map((n) => [n.id, n]));

    const links = viewModel.edges.flatMap((e) => {
      const other = byId.get(e.source === node.id ? e.target : e.source);

      return (e.source === node.id || e.target === node.id) && other ? [{ node: other, count: e.count, secret: e.secret }] : [];
    });

    return { ...hood, detail: { node, links } as GraphDetail | null };
  }, [viewModel, graph, selectedId]);

  const visibleSelectedId = selection.detail ? selectedId : null;

  const focusNode = useCallback((id: string | null) => {
    setSelectedId(id);

    if (id) setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
  }, []);

  const isEgo = !!egoId && viewModel !== model;

  const pick = useCallback(
    (id: string) => {
      if (!id.startsWith("scene:")) setPicked((p) => (p.has(id) ? p : new Set(p).add(id)));

      focusNode(id);
    },
    [focusNode],
  );

  const setEgo = useCallback(
    (on: boolean) => setEgoId(on ? selectedId : null),
    [selectedId],
  );

  const firstMatch = matches[0] ?? null;

  if (firstMatch !== autoFor) {
    setAutoFor(firstMatch);
    setMatchIndex(0);

    if (firstMatch) focusNode(firstMatch);
  }

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setMatchIndex(0);
  }, []);

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;

    const current = matchIndex % matches.length;

    const next = matches[current] === selectedId ? (current + 1) % matches.length : current;

    setMatchIndex(next);
    focusNode(matches[next] ?? null);
  }, [matches, matchIndex, selectedId, focusNode]);

  const patchFilters = useCallback((patch: Partial<GraphFilters>) => setFilters((f) => ({ ...f, ...patch })), []);

  return {
    state: {
      isLoading,
      isError,
      isEmpty: !!index && index.scenes.length === 0,
      graph,
      showSequence,
      layoutMode,
      isEgo,
      list,
      focus,
      filters,
      query,
      selectedId: visibleSelectedId,
      matches,
      matchIndex,
      truncated: model?.truncated ?? 0,
      entityTotal: model?.entityTotal ?? 0,
      overLimit: (model?.nodes.length ?? 0) > GRAPH_WARN_NODES,
      counts: index?.counts ?? null,
    },
    set: { filters: patchFilters, query: setQuery, selected: setSelectedId, focus: focusNode, pick, ego: setEgo, layout: setLayoutMode, sequence: setShowSequence, nextMatch, retry: () => void refetch() },
    selection,
  };
}
