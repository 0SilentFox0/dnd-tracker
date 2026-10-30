"use client";

import { useTranslations } from "next-intl";
import { ScrollText, TriangleAlert } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { Input } from "@/components/ui/input";
import { GRAPH_TYPE_STYLE } from "@/lib/constants/scenario-graph";
import type { GraphListGroup } from "@/lib/utils/scenario/graph/list";

export interface GraphListPanelProps {
  groups: GraphListGroup[];
  selectedId: string | null;
  query: string;
  onQuery: (q: string) => void;
  onPick: (id: string) => void;
}

export function GraphListPanel({ groups, selectedId, query, onQuery, onPick }: GraphListPanelProps) {
  const t = useTranslations("scenarioGraph.list");

  const tType = useTranslations("scenario.mentionTypes");

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Input type="text" aria-label={t("search")} placeholder={t("searchPlaceholder")} value={query} className="h-8" onChange={(e) => onQuery(e.target.value)} />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1" role="list" aria-label={t("title")}>
        {groups.length === 0 ? <p className="p-2 text-sm text-muted-foreground">{t("empty")}</p> : null}
        {groups.map((group) => {
          const style = group.key === "scenes" ? null : GRAPH_TYPE_STYLE[group.key];

          const Icon = style?.icon ?? ScrollText;

          return (
            <section key={group.key} className="mb-2" role="listitem" aria-label={group.key === "scenes" ? t("scenes") : tType(group.key)}>
              <h3 className="sticky top-0 z-10 flex items-center gap-1.5 bg-card px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className="size-3.5" style={{ color: style?.color }} aria-hidden />
                {group.key === "scenes" ? t("scenes") : tType(group.key)}
                <span className="font-normal">({group.items.length})</span>
              </h3>
              <ul className="flex flex-col">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-list-id={item.id}
                      aria-current={item.id === selectedId ? "true" : undefined}
                      className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none ${item.id === selectedId ? "bg-accent font-medium" : ""}`}
                      onClick={() => onPick(item.id)}
                    >
                      {item.image ? <EntityIcon src={item.image} name={item.label} size={40} className="size-5 rounded-full" fallback={<Icon className="size-3" style={{ color: style?.color }} aria-hidden />} /> : null}
                      <span className={`flex-1 truncate ${item.missing ? "line-through opacity-70" : ""}`}>{item.label}</span>
                      {item.missing ? <TriangleAlert className="size-3.5 text-destructive" aria-label={t("missing")} /> : null}
                      <span className="text-xs tabular-nums text-muted-foreground" title={t("counts", { degree: item.degree, mentions: item.mentions })}>
                        {item.degree}/{item.mentions}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
