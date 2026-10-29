"use client";

import { type MouseEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { Items, Picks, type ProgressionActions, STATE_CLASS } from "./ProgressionRowView";

import { HudChipTabs, HudPanel } from "@/components/hud/page";
import { cn } from "@/lib/utils";
import type { ClassProgression } from "@/types/classes";

interface Props {
  progression: ClassProgression;
  mode: "dm" | "sheet";
  actions?: ProgressionActions;
}

const INTERACTIVE = "a,button,summary,details,input,select,textarea";

const open = (e: MouseEvent<HTMLElement>, fn: () => void) => {
  if (!(e.target as HTMLElement).closest(INTERACTIVE)) fn();
};

const CELL = "border-t border-hud-rule px-2 py-1.5 align-top";

export function ClassProgressionMap({ progression, mode, actions }: Props) {
  const t = useTranslations("classes.progression");

  const { subclasses, rows, color } = progression;

  const isTemplate = mode === "dm";

  const [picked, setPicked] = useState<string | null>(null);

  const mobileSub = picked ?? subclasses.find((s) => s.chosen)?.id ?? subclasses[0]?.id ?? null;

  return (
    <HudPanel as="div">
      <table className="hidden w-full text-left sm:table">
        <thead>
          <tr className="text-xs text-hud-muted">
            <th className="px-2 py-1">{t("level")}</th>
            <th className="px-2 py-1">{t("base")}</th>
            {subclasses.map((s) => (
              <th key={s.id} className={cn("px-2 py-1", !isTemplate && !s.chosen && "opacity-50")} style={s.chosen && color ? { color } : undefined}>
                {s.name}
              </th>
            ))}
            <th className="px-2 py-1">{t("choice")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.level} data-state={row.state} className={STATE_CLASS[row.state]}>
              <td className={CELL}>
                {row.level}
                {row.state === "next" ? <span className="ml-1 text-xs text-hud-muted">{t("next")}</span> : null}
              </td>
              <td className={cn(CELL, actions?.onOpenLevel && "cursor-pointer")} data-testid={`base-${row.level}`} onClick={(e) => open(e, () => actions?.onOpenLevel?.(row.level, "base"))}>
                <Items items={row.base} accent={color} />
              </td>
              {subclasses.map((s) => (
                <td
                  key={s.id}
                  className={cn(CELL, !isTemplate && !s.chosen && "opacity-50", actions?.onOpenLevel && "cursor-pointer")}
                  onClick={(e) => open(e, () => actions?.onOpenLevel?.(row.level, "subclass"))}
                >
                  <Items items={row.bySubclass[s.id] ?? []} />
                </td>
              ))}
              <td className={CELL}>
                <Picks row={row} actions={actions} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sm:hidden">
        {subclasses.length > 0 ? (
          <HudChipTabs ariaLabel={t("subclass")} items={subclasses.map((s) => ({ key: s.id, label: s.name, active: s.id === mobileSub, onSelect: () => setPicked(s.id) }))} />
        ) : null}
        <ol className="mt-2 space-y-2">
          {rows.map((row) => {
            const sub = mobileSub ? (row.bySubclass[mobileSub] ?? []) : [];

            const isEmpty = row.base.length === 0 && sub.length === 0 && row.picks.length === 0;

            return (
            <li key={row.level} data-state={row.state} className={cn("rounded-lg border border-hud-rule p-2", STATE_CLASS[row.state], actions?.onOpenLevel && "cursor-pointer")}
              data-testid={`row-${row.level}`}
              onClick={(e) => open(e, () => actions?.onOpenLevel?.(row.level, sub.length > 0 && row.base.length === 0 ? "subclass" : "base"))}
            >
              <div className="mb-1 text-sm font-semibold">
                {t("level")} {row.level}
                {row.state === "next" ? <span className="ml-1 text-xs font-normal text-hud-muted">{t("next")}</span> : null}
              </div>
              {isEmpty ? (
                <span className="text-hud-muted">-</span>
              ) : (
                <>
                  {row.base.length > 0 && <Items items={row.base} accent={color} />}
                  {sub.length > 0 && <Items items={sub} />}
                  {row.picks.length > 0 && <Picks row={row} actions={actions} />}
                </>
              )}
            </li>
            );
          })}
        </ol>
      </div>
    </HudPanel>
  );
}
