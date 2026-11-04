"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Crosshair, Swords } from "lucide-react";

import { SheetRollDialog, type SheetRollRequest } from "./rest/SheetRollDialog";
import { Breakdown } from "./Breakdown";
import { useProfile } from "./ProfileContext";

import { EmptyState } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { systemUiOf } from "@/components/systems";
import { AttackType } from "@/lib/constants/battle";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { signed } from "@/lib/utils/common/format";
import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";
import type { SheetLine } from "@/types/characters";

function Row({ label, value, lines }: { label: string; value: string; lines?: SheetLine[] }) {
  const [open, setOpen] = useState(false);

  const expandable = !!lines && lines.length > 1;

  return (
    <div className="border-b border-hud-raised py-1.5 text-sm">
      <button type="button" disabled={!expandable} aria-expanded={expandable ? open : undefined} onClick={() => setOpen((v) => !v)} className="flex min-h-8 w-full items-center justify-between gap-3 text-left disabled:cursor-default">
        <span>{label}</span>
        <span className="tabular-nums text-hud-ink">{value}</span>
      </button>
      {open && lines && <Breakdown lines={lines} />}
    </div>
  );
}

export function CombatTab() {
  const { campaignId, sheet } = useProfile();

  const t = useTranslations("characterProfile.combat");

  const tg = useTranslations("gameTerms");

  const { data: rules } = useCampaignRules(campaignId);

  const Ui = systemUiOf(sheet.system);

  const { attacks: showAttacks, d20Stats } = RULE_SYSTEM_REGISTRY[sheet.system];

  const [openAttack, setOpenAttack] = useState<string | null>(null);

  const [rollRequest, setRollRequest] = useState<SheetRollRequest | null>(null);

  const canRoll = !!sheet.rest && (sheet.viewer.isOwner || sheet.viewer.isDM);

  return (
    <>
      <Ui.StatsTab section="top" onRoll={setRollRequest} canRoll={canRoll} />
      {showAttacks && (
      <HudSection title={t("attacks")}>
        {sheet.attacks.length === 0 ? (
          <EmptyState title={t("noAttacks")} className="border-hud-rule py-6 text-hud-muted" />
        ) : (
          sheet.attacks.map((a) => (
            <div key={a.id} className="mb-1.5 rounded-[10px] border border-hud-line bg-hud-field px-2.5 py-2">
              <button type="button" aria-expanded={openAttack === a.id} onClick={() => setOpenAttack((v) => (v === a.id ? null : a.id))} className="flex min-h-10 w-full flex-wrap items-center justify-between gap-x-2 text-left">
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  {a.kind === AttackType.RANGED ? <Crosshair className="size-4 shrink-0" /> : <Swords className="size-4 shrink-0" />}
                  {a.name}
                </span>
                <span className="shrink-0 whitespace-nowrap text-sm text-hud-muted">
                  <b className="text-lg text-hud-ink">{signed(a.toHit.total)}</b> {t("hitShort")} · <b className="text-lg text-hud-ink">≈{a.avgDamage.total}</b> {t("damage")}
                </span>
              </button>
              {openAttack === a.id && (
                <>
                  <p className="mt-2 text-[11px] uppercase text-hud-gold">{t("toHit")}</p>
                  <Breakdown lines={a.toHit.lines} />
                  <p className="mt-2 text-[11px] uppercase text-hud-gold">{t("avgDamage")}</p>
                  <Breakdown lines={a.avgDamage.lines} />
                </>
              )}
            </div>
          ))
        )}
      </HudSection>
      )}
      <HudSection title={t("defense")}>
        {d20Stats && (
          <>
            <Row label="AC" value={String(sheet.armorClass.total)} lines={sheet.armorClass.lines} />
            <Row label={tg("stats.initiative")} value={String(sheet.initiative)} />
            <Row label={tg("stats.speed")} value={String(sheet.speed)} />
          </>
        )}
        {d20Stats && rules?.morale.enabled !== false && <Row label={tg("stats.moral")} value={signed(sheet.morale)} />}
        {showAttacks && <Row label={t("targets")} value={sheet.targets.min === sheet.targets.max ? String(sheet.targets.max) : `${sheet.targets.min}–${sheet.targets.max}`} />}
        {sheet.immunities.length > 0 && <Row label={t("immunities")} value={sheet.immunities.join(", ")} />}
      </HudSection>
      <Ui.StatsTab section="bottom" onRoll={setRollRequest} canRoll={canRoll} />
      {canRoll && <SheetRollDialog request={rollRequest} onClose={() => setRollRequest(null)} />}
    </>
  );
}
