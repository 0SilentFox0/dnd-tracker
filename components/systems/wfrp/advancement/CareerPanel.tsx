"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { skillLabel } from "../skill-label";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useCareers } from "@/lib/hooks/careers";
import { useCareerOps } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { useFeats } from "@/lib/hooks/feats";
import type { Characteristics } from "@/lib/utils/rules/systems";
import { parseSkillAdvanceKey } from "@/lib/utils/rules/systems/wfrp/skills/catalog";

interface Props {
  campaignId: string;
  characterId: string;
  state: Characteristics["career"];
  isDM: boolean;
}

export function CareerPanel({ campaignId, characterId, state, isDM }: Props) {
  const t = useTranslations("wfrpAdvancement.career");

  const tu = useTranslations("wfrpAdvancement.ui");

  const tc = useTranslations("gameTerms.characteristics");

  const tg = useTranslations("gameTerms");

  const careers = useCareers(campaignId);

  const rules = useCampaignRules(campaignId);

  const feats = useFeats(campaignId);

  const ops = useCareerOps(campaignId, characterId);

  const confirm = useConfirm();

  const [pick, setPick] = useState("");

  const career = state ? careers.data?.find((c) => c.id === state.careerId) : undefined;

  const required = state && state.tier < 4 ? rules.data?.advancement.career.ticksRequired[state.tier - 1] : undefined;

  const tickLabel = (tick: string) => {
    const [kind, ...rest] = tick.split(":");

    const key = rest.join(":");

    if (kind === "characteristic") return tc(`${key as "ws"}.label`);

    if (kind === "talent") return feats.data?.find((f) => f.id === key)?.name ?? tu("unknownTalent");

    const { key: skill, spec } = parseSkillAdvanceKey(key);

    return skillLabel(tg, skill, spec);
  };

  const advance = async () => {
    if (!state) return;

    const short = required !== undefined && state.ticks.length < required;

    if (short && !(await confirm({ title: t("advance"), description: t("forceBody", { have: state.ticks.length, need: required }), confirmLabel: t("advance") }))) return;

    await ops.advanceCareer(short);
  };

  const picker = isDM && (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <SelectField aria-label={t("pick")} value={pick} onValueChange={setPick} options={(careers.data ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder={t("pick")} triggerClassName="min-h-11 w-full" />
      <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={!pick || ops.isPending} onClick={() => void ops.setCareer(pick)}>
        {t("assign")}
      </Button>
    </div>
  );

  if (!state) {
    return (
      <HudSection title={t("title")}>
        {isDM ? picker : <p className="text-sm text-hud-muted">{t("none")}</p>}
      </HudSection>
    );
  }

  return (
    <HudSection title={t("title")}>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <b className="min-w-0 truncate text-hud-ink">{career?.name ?? "—"}</b>
          <span className="shrink-0 tabular-nums text-hud-muted">{t("tier", { tier: state.tier })}</span>
        </div>
        {career?.tiers[state.tier - 1]?.name && <p className="text-xs text-hud-muted">{career.tiers[state.tier - 1].name}</p>}
        {required !== undefined && <p className="text-sm tabular-nums">{t("ticks", { have: state.ticks.length, need: required })}</p>}
        {state.ticks.length > 0 && (
          <ul className="flex flex-wrap gap-1 text-xs">
            {state.ticks.map((tick) => (
              <li key={tick} className="rounded border border-hud-line px-1.5 py-0.5">
                {tickLabel(tick)}
              </li>
            ))}
          </ul>
        )}
        {isDM && state.tier < 4 && (
          <Button type="button" size="sm" className="min-h-11" disabled={ops.isPending} onClick={() => void advance()}>
            {t("advance")}
          </Button>
        )}
        {picker}
      </div>
    </HudSection>
  );
}
