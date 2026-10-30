"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { HudPill } from "@/components/hud/page";
import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import { cn } from "@/lib/utils";
import { hasSubclassOnly, rowItems, subclassPreview } from "@/lib/utils/characters/classes";
import type { ClassProgression, ProgressionItem, ProgressionPick, ProgressionRow } from "@/types/classes";

interface PathRowCardProps {
  row: ProgressionRow;
  progression: ClassProgression;
  chosen: string | null;
  onPick?: (pickKey: string) => void;
  onDetail: (item: ProgressionItem) => void;
  names?: Record<string, string>;
}

const STATE_TONE = { current: "gold", next: "accent", reached: "muted", future: "muted", template: "muted", waiting: "accent" } as const;

function SubclassOptions({ progression }: { progression: ClassProgression }) {
  const t = useTranslations("characterProfile.path");

  return (
    <details className="mt-1 text-xs text-hud-muted">
      <summary className="cursor-pointer">{t("subclassOptions")}</summary>
      <ul className="mt-1 space-y-1">
        {subclassPreview(progression).map((sub) => (
          <li key={sub.id}>
            <span className="font-semibold text-hud-ink">{sub.name}</span>
            {sub.gains.map((g) => (
              <p key={g.level} className="break-words">
                {t("subclassGain", { level: g.level, names: g.names.join(", ") })}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </details>
  );
}

function PickLine({ pick, level, progression, names, onPick }: { pick: ProgressionPick; level: number; progression: ClassProgression; names?: Record<string, string>; onPick?: (pickKey: string) => void }) {
  const t = useTranslations("characterProfile.path");

  const tg = useTranslations("gameTerms");

  const tc = useTranslations("classes.progression");

  const values = { label: pick.label, done: pick.done ?? 0, required: pick.required };

  const subclass = progression.subclasses.find((c) => c.chosen)?.name;

  const pickButton = (label: string) => (
    <button type="button" onClick={() => onPick?.(pick.key)} className="min-h-10 w-full rounded-md border border-hud-gold-strong/60 px-3 py-2 text-left text-sm text-hud-gold-strong">
      {label}
    </button>
  );

  if (pick.kind === "subclass") {
    if (subclass) return <span className="text-sm">{t("done", { label: subclass })}</span>;

    return (
      <>
        {pick.status === "open" && onPick ? pickButton(t("pickSubclass")) : <span className="text-sm">{tc(pick.status === "open" ? "chooseSubclass" : "subclass")}</span>}
        <SubclassOptions progression={progression} />
      </>
    );
  }

  if (pick.status === "locked") return <span className="text-sm text-hud-muted">{t("unlocksAt", { label: pick.label, level })}</span>;

  if (pick.status === "done") {
    const chosen = (pick.chosen ?? []).map((id) => names?.[id] ?? ((DND_SKILLS as readonly string[]).includes(id) ? tg(`dndSkills.${id as DndSkill}`) : id)).join(", ");

    return <span className="text-sm">{chosen ? t("doneWith", { label: pick.label, chosen }) : t("done", { label: pick.label })}</span>;
  }

  if (!onPick) return <span className="text-sm text-hud-gold-strong">{t("pickOpen", values)}</span>;

  return pickButton(t("pick", values));
}

export function PathRowCard({ row, progression, chosen, onPick, onDetail, names }: PathRowCardProps) {
  const t = useTranslations("characterProfile.path");

  const stateKey = row.state === "reached" && row.picks.some((p) => p.status === "open") ? "waiting" : row.state;

  return (
    <section data-state={row.state} className={cn("rounded-lg border border-hud-rule p-3", row.state === "current" && "ring-1 ring-hud-gold-strong")}>
      <header className="mb-2 flex items-center justify-between gap-2">
        <h4 className="hud-sc text-sm text-hud-ink">{t("level", { level: row.level })}</h4>
        <span className="flex items-center gap-1">
          {row.state === "future" && hasSubclassOnly(row, chosen) ? <HudPill tone="muted">{t("subclassDepends")}</HudPill> : null}
          <HudPill tone={STATE_TONE[stateKey]}>{t(`state.${stateKey}`)}</HudPill>
        </span>
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
            <PickLine pick={pick} level={row.level} progression={progression} names={names} onPick={onPick} />
          </li>
        ))}
      </ul>
    </section>
  );
}
