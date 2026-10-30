"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Network } from "lucide-react";

import { GraphInspector } from "./GraphInspector";
import { GraphListPanel } from "./GraphListPanel";
import { GraphToolbar } from "./GraphToolbar";
import { ScenarioGraphView } from "./ScenarioGraphView";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { ScenarioSummaryPanel } from "@/components/scenario/ScenarioSummaryPanel";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/common";
import { useScenarioGraph } from "@/lib/hooks/scenario";
import { graphNodeHref } from "@/lib/utils/scenario/graph/href";
import { defaultFilters } from "@/lib/utils/scenario/graph/model";
import type { GraphNode } from "@/lib/utils/scenario/graph/types";

function SummarySlot({ campaignId, pageId }: { campaignId: string; pageId: string }) {
  const t = useTranslations("scenario.summary");

  return (
    <div className="border-t pt-3">
      <p className="mb-2 text-sm font-medium">{t("title")}</p>
      <ScenarioSummaryPanel campaignId={campaignId} pageId={pageId} />
    </div>
  );
}

export function ScenarioGraph({ campaignId }: { campaignId: string }) {
  const t = useTranslations("scenarioGraph");

  const router = useRouter();

  const isDesktop = useMediaQuery(DESKTOP_QUERY, true);

  const { state, set, selection } = useScenarioGraph(campaignId);

  const matched = useMemo(() => new Set(state.matches), [state.matches]);

  const select = set.selected;

  const pickNode = set.pick;

  const [listPref, setListPref] = useState<boolean | null>(null);

  const listOpen = listPref ?? isDesktop;

  const setListOpen = setListPref;

  const pick = useCallback(
    (id: string) => {
      pickNode(id);

      if (!isDesktop) setListPref(false);
    },
    [pickNode, isDesktop],
  );

  const clear = useCallback(() => select(null), [select]);

  const open = useCallback(
    (node: GraphNode) => {
      const href = graphNodeHref(campaignId, node);

      if (href) router.push(href);
    },
    [campaignId, router],
  );

  const hasSelection = !!state.selectedId;

  const { isEgo } = state;

  const exitEgo = set.ego;

  useEffect(() => {
    if (!hasSelection && !isEgo) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (isEgo) exitEgo(false);
      else select(null);
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [hasSelection, isEgo, select, exitEgo]);

  if (state.isLoading) return <LoadingState />;

  if (state.isError) return <ErrorState error={null} onRetry={set.retry} />;

  if (state.isEmpty) {
    return (
      <EmptyState
        icon={Network}
        title={t("empty.noPages")}
        action={<Button asChild><Link href={`/campaigns/${campaignId}/dm/scenario`}>{t("empty.noPagesAction")}</Link></Button>}
      />
    );
  }

  const { graph, counts } = state;

  const noEntities = !!counts && counts.entities === 0;

  const detail = selection.detail;

  const inspector = detail ? <GraphInspector detail={detail} canOpen={!!graphNodeHref(campaignId, detail.node)} onOpen={() => open(detail.node)} onSelect={set.focus} onClose={clear} focusMode={isEgo} onToggleFocus={() => set.ego(!isEgo)}>{detail.node.kind === "scene" ? <SummarySlot campaignId={campaignId} pageId={detail.node.refId} /> : null}</GraphInspector> : null;

  const listPanel = <GraphListPanel groups={state.list} selectedId={state.selectedId} query={state.query} onQuery={set.query} onPick={pick} />;

  const body = () => {
    if (!graph || graph.nodes.length === 0) {
      return <EmptyState icon={Network} title={t("empty.filtered")} description={t("empty.filteredHint")} action={<Button onClick={() => set.filters(defaultFilters())}>{t("empty.resetFilters")}</Button>} />;
    }

    return <ScenarioGraphView graph={graph} selection={selection} selectedId={state.selectedId} focus={state.focus} showSequence={state.showSequence} matched={matched} onSelect={set.selected} onClear={clear} onOpen={open} />;
  };

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[480px] flex-col gap-3">
      <GraphToolbar
        filters={state.filters}
        showSequence={state.showSequence}
        timeline={state.layoutMode === "timeline"}
        listOpen={listOpen}
        counts={counts?.byType ?? {}}
        query={state.query}
        matches={{ current: state.matches.length === 0 ? 0 : (state.matchIndex % state.matches.length) + 1, total: state.matches.length }}
        onFilters={set.filters}
        onShowSequence={set.sequence}
        onTimeline={(on) => set.layout(on ? "timeline" : "free")}
        onToggleList={() => setListOpen(!listOpen)}
        onQuery={set.query}
        onNextMatch={set.nextMatch}
      />
      {state.truncated > 0 ? (
        <div role="status" className="flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm">
          <span>{t("limits.truncated", { shown: state.entityTotal - state.truncated, total: state.entityTotal })}</span>
          <Button size="sm" variant="outline" onClick={() => set.filters({ showAll: true })}>{t("limits.showAll")}</Button>
        </div>
      ) : null}
      {state.overLimit ? <p role="status" className="text-sm text-destructive">{t("limits.overLimit")}</p> : null}
      {noEntities ? (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-dashed bg-card/50 px-3 py-2 text-sm">
          <Network className="size-4 text-muted-foreground" aria-hidden />
          <span className="font-medium">{t("empty.noMentions")}</span>
          <span className="text-muted-foreground">{t("empty.noMentionsHint")}</span>
          <Button asChild size="sm" variant="outline"><Link href={`/campaigns/${campaignId}/dm/scenario`}>{t("empty.noPagesAction")}</Link></Button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 gap-3">
        {listOpen && isDesktop ? <aside aria-label={t("list.title")} className="w-64 shrink-0 rounded-lg border bg-card/90 p-2">{listPanel}</aside> : null}
        <div className="relative min-w-0 flex-1">
        {body()}
        {inspector && isDesktop ? <aside aria-label={t("inspector.title")} className="absolute inset-y-2 right-2 w-72 overflow-y-auto rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur-sm">{inspector}</aside> : null}
        </div>
      </div>
      {listOpen && !isDesktop ? (
        <ResponsiveDialog open onOpenChange={(o) => !o && setListOpen(false)} title={t("list.title")}>
          <div className="h-[60dvh]">{listPanel}</div>
        </ResponsiveDialog>
      ) : null}
      {inspector && !isDesktop ? (
        <ResponsiveDialog open onOpenChange={(o) => !o && clear()} title={t("inspector.title")}>
          {inspector}
        </ResponsiveDialog>
      ) : null}
    </div>
  );
}
