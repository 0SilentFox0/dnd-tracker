"use client";

import { type ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { Crosshair, Swords } from "lucide-react";

import { SheetRollDialog, type SheetRollRequest } from "./rest/SheetRollDialog";
import { Breakdown } from "./Breakdown";
import { useProfile } from "./ProfileContext";

import { EmptyState } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { AttackType } from "@/lib/constants/battle";
import type { DndSkill } from "@/lib/constants/skills";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { cn } from "@/lib/utils";
import { signed } from "@/lib/utils/common/format";
import type { SheetLine } from "@/types/characters";

function Row({ label, value, lines }: { label: string; value: string; lines?: SheetLine[] }) {
  const [open, setOpen] = useState(false);

  const expandable = !!lines && lines.length > 1;

  return (
    <div className="border-b border-[#2a2218] py-1.5 text-sm">
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

  const tc = useTranslations("common");

  const { data: rules } = useCampaignRules(campaignId);

  const [openAttack, setOpenAttack] = useState<string | null>(null);

  const [rollRequest, setRollRequest] = useState<SheetRollRequest | null>(null);

  const canRoll = !!sheet.rest && (sheet.viewer.isOwner || sheet.viewer.isDM);

  const rollable = (request: SheetRollRequest, children: ReactNode) =>
    canRoll ? (
      <button type="button" title={t("roll")} onClick={() => setRollRequest(request)} className="flex w-full justify-between gap-2 text-left">
        <span className="sr-only">{t("roll")}: </span>
        {children}
      </button>
    ) : (
      <div className="flex w-full justify-between gap-2">{children}</div>
    );

  return (
    <>
      <HudSection title={t("abilities")}>
        <div className="grid grid-cols-6 gap-1">
          {sheet.abilities.map((a) => (
            <div key={a.key} className={cn("min-w-0 rounded-lg border bg-hud-field py-1 text-center", a.isPrimary ? "border-hud-gold shadow-[inset_0_0_0_1px_var(--color-hud-gold)]" : "border-hud-line")}>
              <small className="block text-[10px] text-hud-muted">
                {tc(`abilities.${a.key}.short`)}
                {a.isPrimary ? " ★" : ""}
              </small>
              <b className="block text-[17px] leading-5">{a.score}</b>
              <span className={cn("block text-[15px] font-semibold leading-5 tabular-nums", a.isPrimary ? "text-hud-gold" : "text-hud-muted")}>{signed(a.mod)}</span>
            </div>
          ))}
        </div>
        {sheet.primaryAbility && <p className="mt-1.5 text-xs text-hud-muted">{t("primaryHint")}</p>}
      </HudSection>
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
      <HudSection title={t("defense")}>
        <Row label="AC" value={String(sheet.armorClass.total)} lines={sheet.armorClass.lines} />
        <Row label={tc("stats.initiative")} value={String(sheet.initiative)} />
        <Row label={tc("stats.speed")} value={String(sheet.speed)} />
        {rules?.morale.enabled !== false && <Row label={tc("stats.moral")} value={signed(sheet.morale)} />}
        <Row label={t("targets")} value={sheet.targets.min === sheet.targets.max ? String(sheet.targets.max) : `${sheet.targets.min}–${sheet.targets.max}`} />
        {sheet.immunities.length > 0 && <Row label={t("immunities")} value={sheet.immunities.join(", ")} />}
      </HudSection>
      <HudSection title={t("saves")}>
        <ul className="grid grid-cols-2 gap-x-4 text-sm">
          {sheet.saves.map((s) => (
            <li key={s.key} className="border-b border-[#2a2218] py-1">
              {rollable(
                { label: t("saveRoll", { ability: tc(`abilities.${s.ability}.label`) }), subject: { kind: "save", ability: s.ability } },
                <>
                  <span className="min-w-0 truncate">
                    {s.proficient ? (s.expertise ? "●● " : "● ") : ""}
                    {tc(`abilities.${s.ability}.label`)}
                    {s.expertise && <span className="ml-1 text-xs text-hud-muted">×2</span>}
                  </span>
                  <span className="tabular-nums">{signed(s.bonus)}</span>
                </>,
              )}
            </li>
          ))}
        </ul>
      </HudSection>
      <HudSection title={t("skills")}>
        <ul className="grid grid-cols-2 gap-x-4 text-sm">
          {sheet.skills.map((s) => (
            <li key={s.key} className="border-b border-[#2a2218] py-1">
              {rollable(
                { label: tc(`dndSkills.${s.key as DndSkill}`), subject: { kind: "check", skill: s.key as DndSkill } },
                <>
                  <span className="min-w-0 truncate">
                    {s.proficient ? "● " : ""}
                    {tc(`dndSkills.${s.key as DndSkill}`)}
                  </span>
                  <span className="tabular-nums">{signed(s.bonus)}</span>
                </>,
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-hud-muted">
          {t("passives", sheet.passives)}
        </p>
        {(sheet.languages.length > 0 || sheet.proficiencies.length > 0) && (
          <p className="mt-1 text-xs text-hud-muted">
            {[sheet.languages.length ? t("languages", { list: sheet.languages.join(", ") }) : null, sheet.proficiencies.length ? t("proficiencies", { list: sheet.proficiencies.join(", ") }) : null].filter(Boolean).join(" · ")}
          </p>
        )}
      </HudSection>
      {canRoll && <SheetRollDialog request={rollRequest} onClose={() => setRollRequest(null)} />}
    </>
  );
}
