"use client";

import { cn } from "@/lib/utils";
import type { ProgressionItem, ProgressionPick, ProgressionRow } from "@/types/classes";

export interface ProgressionActions {
  onOpenLevel?: (level: number, column: "base" | "subclass" | "pick") => void;
  onPick?: (pick: ProgressionPick, level: number) => void;
  onChooseSubclass?: () => void;
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

export function Picks({ row, actions }: { row: ProgressionRow; actions?: ProgressionActions }) {
  if (row.picks.length === 0) return <span className="text-hud-muted">-</span>;

  return (
    <ul className="space-y-1">
      {row.picks.map((pick) => {
        const isSubclass = pick.kind === "subclass";

        const handler = isSubclass ? actions?.onChooseSubclass : actions?.onPick ? () => actions.onPick?.(pick, row.level) : undefined;

        const open = pick.status === "open";

        const text = isSubclass && open ? "Оберіть підклас" : pick.label;

        const badge = (
          <span className={cn("rounded-full px-2 py-0.5 text-xs", open ? "bg-hud-gold-strong/20 text-hud-gold-strong" : "text-hud-muted")}>
            {open ? "вибір" : pick.status === "done" ? "готово" : pick.status === "locked" ? "закрито" : ""} {text}
            {pick.required > 1 ? ` (${pick.done ?? 0}/${pick.required})` : ""}
          </span>
        );

        return <li key={pick.key}>{open && handler ? <button type="button" onClick={handler}>{badge}</button> : badge}</li>;
      })}
    </ul>
  );
}
