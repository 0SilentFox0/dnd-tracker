"use client";

import { useTranslations } from "next-intl";

import { skillLabel } from "../skill-label";

import { Button } from "@/components/ui/button";
import type { LedgerEntry } from "@/lib/utils/rules/systems";
import { parseSkillAdvanceKey } from "@/systems/wfrp/rules/skills/catalog";
import type { FeatData } from "@/types/choices";

const LEDGER_SHOWN = 20;

interface Props {
  ledger: LedgerEntry[];
  featsById: Map<string, FeatData>;
  isDM: boolean;
  pending: boolean;
  onUndo: () => void;
}

export function AdvanceLedger({ ledger, featsById, isDM, pending, onUndo }: Props) {
  const t = useTranslations("wfrpAdvancement.ui");

  const tg = useTranslations("gameTerms");

  const tc = useTranslations("gameTerms.characteristics");

  if (ledger.length === 0) return <p className="text-sm text-hud-muted">{t("ledgerEmpty")}</p>;

  const name = (entry: LedgerEntry) => {
    if (entry.kind === "characteristic") return tc(`${entry.key as "ws"}.label`);

    if (entry.kind === "skill") {
      const { key, spec } = parseSkillAdvanceKey(entry.key);

      return skillLabel(tg, key, spec);
    }

    return featsById.get(entry.key)?.name ?? t("unknownTalent");
  };

  const shown = ledger.slice(-LEDGER_SHOWN).reverse();

  return (
    <ul className="text-sm">
      {shown.map((entry, i) => (
        <li key={entry.id} className="flex items-center gap-2 border-b border-hud-line py-1.5 last:border-b-0">
          <div className="min-w-0 flex-1">
            <span className="block truncate">{name(entry)}</span>
            <small className="text-xs text-hud-muted">
              {entry.from} → {entry.to} · {t("spent", { cost: entry.cost })} · {entry.at.slice(0, 10)}
            </small>
          </div>
          {isDM && i === 0 && (
            <Button type="button" size="sm" variant="outline" className="min-h-11 shrink-0" disabled={pending} onClick={onUndo}>
              {t("undo")}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
