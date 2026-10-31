"use client";

import { useTranslations } from "next-intl";

import { EntityIcon } from "@/components/common/EntityIcon";
import { cn } from "@/lib/utils";
import type { ProgressionItem, ProgressionRow } from "@/types/classes";

export interface ProgressionActions {
  onOpenLevel?: (level: number, column: "base" | "subclass" | "pick") => void;
}

export const STATE_CLASS: Record<ProgressionRow["state"], string> = {
  reached: "",
  current: "ring-1 ring-hud-gold-strong",
  next: "",
  future: "opacity-50",
  template: "",
};

export function Items({ items, accent }: { items: ProgressionItem[]; accent?: string | null }) {
  if (items.length === 0) return <span className="text-hud-muted">-</span>;

  return (
    <ul className="space-y-1">
      {items.map((it) => (
        <li key={it.key}>
          <details>
            <summary className={cn("cursor-pointer text-sm", it.description ? "" : "list-none")} style={accent ? { color: accent } : undefined}>
              {it.icon ? <EntityIcon src={it.icon} name={it.name} size={20} className="mr-1 inline-flex size-5 align-middle rounded" /> : null}
              {it.name}
              {it.summary ? <span className="ml-1 text-xs text-hud-muted">{it.summary}</span> : null}
            </summary>
            {it.description ? <p className="mt-1 whitespace-pre-line text-xs text-hud-muted">{it.description}</p> : null}
          </details>
        </li>
      ))}
    </ul>
  );
}

export function Picks({ row }: { row: ProgressionRow }) {
  const t = useTranslations("classes.progression");

  if (row.picks.length === 0) return <span className="text-hud-muted">-</span>;

  return (
    <ul className="space-y-1">
      {row.picks.map((pick, i) => (
        <li key={`${i}:${pick.key}`} className="text-xs text-hud-muted">
          {pick.kind === "subclass" ? t("subclass") : pick.label}
          {pick.required > 1 ? ` (${pick.required})` : ""}
        </li>
      ))}
    </ul>
  );
}
