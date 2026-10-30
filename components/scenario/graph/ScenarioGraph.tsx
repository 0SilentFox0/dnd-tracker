"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Network } from "lucide-react";

import { GraphInspector } from "./GraphInspector";
import { GraphToolbar } from "./GraphToolbar";
import { ScenarioGraphView } from "./ScenarioGraphView";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/common";
import { useScenarioGraph } from "@/lib/hooks/scenario";
import { graphNodeHref } from "@/lib/utils/scenario/graph/href";
import { defaultFilters } from "@/lib/utils/scenario/graph/model";
import type { GraphNode } from "@/lib/utils/scenario/graph/types";

export function ScenarioGraph({ campaignId }: { campaignId: string }) {
  const t = useTranslations("scenarioGraph");

  const router = useRouter();

  const isDesktop = useMediaQuery(DESKTOP_QUERY, true);

  const { state, set, selection } = useScenarioGraph(campaignId);

  const matched = useMemo(() => new Set(state.matches), [state.matches]);

  const select = set.selected;

  const clear = useCallback(() => select(null), [select]);

  const open = useCallback(
    (node: GraphNode) => {
      const href = graphNodeHref(campaignId, node);

      if (href) router.push(href);
    },
    [campaignId, router],
  );

  if (state.isLoading) return <LoadingState />;

  if (state.isError) return <ErrorState error={null} />;

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

  const detail = selection.detail;

  const entityShown = graph?.nodes.filter((n) => n.kind === "entity").length ?? 0;

  const inspector = detail ? <GraphInspector detail={detail} canOpen={!!graphNodeHref(campaignId, detail.node)} onOpen={() => open(detail.node)} onSelect={set.selected} onClose={clear} /> : null;

  const body = () => {
    if (counts && counts.edges === 0) return <EmptyState icon={Network} title={t("empty.noMentions")} description={t("empty.noMentionsHint")} />;

    if (!graph || graph.nodes.length === 0) {
      return <EmptyState icon={Network} title={t("empty.filtered")} description={t("empty.filteredHint")} action={<Button onClick={() => set.filters(defaultFilters())}>{t("empty.resetFilters")}</Button>} />;
    }

    return <ScenarioGraphView graph={graph} selection={selection} selectedId={state.selectedId} matched={matched} onSelect={set.selected} onClear={clear} onOpen={open} />;
  };

  return (
    <div className="flex h-full min-h-[480px] flex-col gap-3">
      <GraphToolbar
        filters={state.filters}
        counts={counts?.byType ?? {}}
        query={state.query}
        matches={{ current: state.matches.length === 0 ? 0 : (state.matchIndex % state.matches.length) + 1, total: state.matches.length }}
        onFilters={set.filters}
        onQuery={set.query}
        onNextMatch={set.nextMatch}
      />
      {state.truncated > 0 ? (
        <div role="status" className="flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm">
          <span>{t("limits.truncated", { shown: entityShown, total: entityShown + state.truncated })}</span>
          <Button size="sm" variant="outline" onClick={() => set.filters({ showAll: true })}>{t("limits.showAll")}</Button>
        </div>
      ) : null}
      {state.overLimit ? <p role="status" className="text-sm text-destructive">{t("limits.overLimit")}</p> : null}
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-w-0 flex-1">{body()}</div>
        {inspector && isDesktop ? <aside aria-label={t("inspector.title")} className="w-72 shrink-0 overflow-y-auto rounded-lg border p-3">{inspector}</aside> : null}
      </div>
      {inspector && !isDesktop ? (
        <ResponsiveDialog open onOpenChange={(o) => !o && clear()} title={t("inspector.title")}>
          {inspector}
        </ResponsiveDialog>
      ) : null}
    </div>
  );
}
