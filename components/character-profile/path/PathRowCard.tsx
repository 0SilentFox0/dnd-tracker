"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { HudPill } from "@/components/hud/page";
import { cn } from "@/lib/utils";
import { rowItems } from "@/lib/utils/characters/classes";
import type { ClassProgression, ProgressionItem, ProgressionPick, ProgressionRow } from "@/types/classes";

interface PathRowCardProps {
  row: ProgressionRow;
  progression: ClassProgression;
  chosen: string | null;
  onPick?: () => void;
  onDetail: (item: ProgressionItem) => void;
}

const STATE_TONE = { current: "gold", next: "accent", reached: "muted", future: "muted", template: "muted" } as const;

function PickLine({ pick, level, subclass, onPick }: { pick: ProgressionPick; level: number; subclass?: string; onPick?: () => void }) {
  const t = useTranslations("characterProfile.path");

  const tc = useTranslations("classes.progression");

  const values = { label: pick.label, done: pick.done ?? 0, required: pick.required };

  if (pick.kind === "subclass") return <span className="text-sm">{subclass ? t("done", { label: subclass }) : tc(pick.status === "open" ? "chooseSubclass" : "subclass")}</span>;

  if (pick.status === "locked") return <span className="text-sm text-hud-muted">{t("unlocksAt", { label: pick.label, level })}</span>;

  if (pick.status === "done") return <span className="text-sm">{t("done", { label: pick.label })}</span>;

  if (!onPick) return <span className="text-sm text-hud-gold-strong">{t("pickOpen", values)}</span>;

  return (
    <button type="button" onClick={onPick} className="min-h-10 w-full rounded-md border border-hud-gold-strong/60 px-3 py-2 text-left text-sm text-hud-gold-strong">
      {t("pick", values)}
    </button>
  );
}

export function PathRowCard({ row, progression, chosen, onPick, onDetail }: PathRowCardProps) {
  const t = useTranslations("characterProfile.path");

  return (
    <section data-state={row.state} className={cn("rounded-lg border border-hud-rule p-3", row.state === "current" && "ring-1 ring-hud-gold-strong")}>
      <header className="mb-2 flex items-center justify-between gap-2">
        <h4 className="hud-sc text-sm text-hud-ink">{t("level", { level: row.level })}</h4>
        <HudPill tone={STATE_TONE[row.state]}>{t(`state.${row.state}`)}</HudPill>
      </header>
      <ul className="space-y-2">
        {rowItems(row, chosen).map((item) => (
          <li key={item.key} className="flex items-start gap-2">
            <EntityIcon name={progression.className} size={32} className="size-8 bg-hud-field text-sm text-hud-gold" />
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-hud-ink">
                {item.name} <HudPill tone="muted">{t("from", { cls: progression.className, level: row.level })}</HudPill>
              </p>
              {item.summary ? <p className="break-words text-xs text-hud-muted">{item.summary}</p> : null}
            </div>
            {item.description ? (
              <button type="button" aria-label={t("details", { name: item.name })} onClick={() => onDetail(item)} className="flex size-9 shrink-0 items-center justify-center rounded-md text-hud-muted hover:text-hud-ink">
                <Info className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
        {row.picks.map((pick, i) => (
          <li key={`${i}:${pick.key}`}>
            <PickLine pick={pick} level={row.level} subclass={progression.subclasses.find((c) => c.chosen)?.name} onPick={onPick} />
          </li>
        ))}
      </ul>
    </section>
  );
}
