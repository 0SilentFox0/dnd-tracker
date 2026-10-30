"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { MENTION_TYPES } from "@/lib/constants/scenario";
import { GRAPH_TYPE_STYLE } from "@/lib/constants/scenario-graph";
import type { GraphFilters } from "@/lib/utils/scenario/graph/types";
import type { MentionType } from "@/types/scenario";

export interface GraphToolbarProps {
  filters: GraphFilters;
  counts: Partial<Record<MentionType, number>>;
  query: string;
  matches: { current: number; total: number };
  onFilters: (patch: Partial<GraphFilters>) => void;
  onQuery: (q: string) => void;
  onNextMatch: () => void;
}

const checkClass = "flex items-center gap-1.5 text-sm";

export function GraphToolbar({ filters, counts, query, matches, onFilters, onQuery, onNextMatch }: GraphToolbarProps) {
  const t = useTranslations("scenarioGraph.toolbar");

  const tType = useTranslations("scenario.mentionTypes");

  const toggleType = (type: MentionType) => {
    const types = new Set(filters.types);

    if (types.has(type)) types.delete(type);
    else types.add(type);

    onFilters({ types });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label={t("filters")}>
      <div className="flex items-center gap-2">
        <Input type="search" role="searchbox" aria-label={t("search")} placeholder={t("searchPlaceholder")} value={query} className="h-8 w-48" onChange={(e) => onQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onNextMatch()} />
        {query.trim() ? <span className="text-xs text-muted-foreground">{t("matches", matches)}</span> : null}
      </div>
      <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <legend className="sr-only">{t("types")}</legend>
        {MENTION_TYPES.map((type) => {
          const Icon = GRAPH_TYPE_STYLE[type].icon;

          return (
            <label key={type} className={checkClass}>
              <input type="checkbox" checked={filters.types.has(type)} onChange={() => toggleType(type)} />
              <Icon className="size-4" style={{ color: GRAPH_TYPE_STYLE[type].color }} aria-hidden />
              {tType(type)} ({counts[type] ?? 0})
            </label>
          );
        })}
      </fieldset>
      <label className={checkClass}>
        <input type="checkbox" checked={filters.onlyMissing} onChange={(e) => onFilters({ onlyMissing: e.target.checked })} />
        {t("onlyMissing")}
      </label>
      <label className={checkClass}>
        <input type="checkbox" checked={filters.showLeaves} onChange={(e) => onFilters({ showLeaves: e.target.checked })} />
        {t("showLeaves")}
      </label>
      <label className={checkClass}>
        <input type="checkbox" checked={filters.showAll} onChange={(e) => onFilters({ showAll: e.target.checked })} />
        {t("showAll")}
      </label>
    </div>
  );
}
