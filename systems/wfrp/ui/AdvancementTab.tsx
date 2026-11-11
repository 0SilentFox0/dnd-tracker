"use client";

import { useTranslations } from "next-intl";

import { AdvanceLedger } from "./advancement/AdvanceLedger";
import { AdvanceRow } from "./advancement/AdvanceRow";
import { CareerPanel } from "./advancement/CareerPanel";
import { NewSkillPicker } from "./advancement/NewSkillPicker";
import { TalentRows } from "./advancement/TalentRows";
import { skillLabel } from "./skill-label";

import { useProfile } from "@/components/character-profile/ProfileContext";
import { LoadingState } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useCareers } from "@/lib/hooks/careers";
import { useAdvance, useCharacter } from "@/lib/hooks/characters";
import { useFeats } from "@/lib/hooks/feats";
import { CHARACTERISTIC_KEYS, readCharacteristics } from "@/lib/utils/rules/systems";
import { advanceCost, availableXp, careerPrice } from "@/systems/wfrp/rules/advancement";
import { value } from "@/systems/wfrp/rules/characteristics";
import { skillAdvanceKey } from "@/systems/wfrp/rules/skills/catalog";
import { SHEET_SLOT } from "@/systems/wfrp/rules/slots";

export function AdvancementTab() {
  const { campaignId, characterId, sheet } = useProfile();

  const t = useTranslations("wfrpAdvancement.ui");

  const tc = useTranslations("gameTerms.characteristics");

  const tg = useTranslations("gameTerms");

  const character = useCharacter(campaignId, characterId);

  const rules = useCampaignRules(campaignId);

  const feats = useFeats(campaignId);

  const advance = useAdvance(campaignId, characterId);

  const careers = useCareers(campaignId);

  if (!character.data || !rules.data || !feats.data || !careers.data) return <LoadingState />;

  const advancement = rules.data.advancement;

  const c = readCharacteristics(character.data);

  const available = availableXp(character.data.experience ?? 0, c);

  const career = c.career;

  const tiers = career ? careers.data.find((row) => row.id === career.careerId)?.tiers : undefined;

  const ctx = career && tiers ? { state: career, tiers } : undefined;

  const price = (kind: "characteristic" | "skill" | "talent", key: string, base: number | null) => (base === null ? { cost: null, outOfCareer: null } : careerPrice(ctx, advancement, kind, key, base));

  const skillRows = SHEET_SLOT.read(sheet.systemSlot)?.skills ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2 text-sm text-hud-muted">
        <span>{t("balance")}</span>
        <b className="text-lg text-hud-ink tabular-nums">{available}</b>
      </div>
      <CareerPanel campaignId={campaignId} characterId={characterId} state={career} isDM={sheet.viewer.isDM} />
      {advance.error && (
        <p role="alert" className="text-sm text-destructive">
          {advance.error}
        </p>
      )}
      <HudSection title={t("characteristics")}>
        <ul>
          {CHARACTERISTIC_KEYS.map((key) => (
            <AdvanceRow
              key={key}
              label={tc(`${key}.label`)}
              value={value(c, key)}
              hint={t("advances", { count: c.advances[key] })}
              cost={price("characteristic", key, advanceCost("characteristic", c.advances[key], advancement)).cost}
              outOfCareer={price("characteristic", key, advanceCost("characteristic", c.advances[key], advancement)).outOfCareer}
              available={available}
              pending={advance.isPending}
              onBuy={() => void advance.buy({ kind: "characteristic", key })}
            />
          ))}
        </ul>
      </HudSection>
      <HudSection title={t("skills")}>
        <ul>
          {skillRows.map((s) => {
            const key = skillAdvanceKey(s.key, s.spec);

            const advances = c.skillAdvances[key] ?? 0;

            const priced = price("skill", key, advanceCost("skill", advances, advancement));

            return <AdvanceRow key={key} label={skillLabel(tg, s.key, s.spec)} value={advances} cost={priced.cost} outOfCareer={priced.outOfCareer} available={available} pending={advance.isPending} onBuy={() => void advance.buy({ kind: "skill", key })} />;
          })}
        </ul>
        <NewSkillPicker cost={(key) => price("skill", key, advanceCost("skill", c.skillAdvances[key] ?? 0, advancement)).cost} available={available} pending={advance.isPending} onBuy={(key) => void advance.buy({ kind: "skill", key })} />
      </HudSection>
      <HudSection title={t("talents")}>
        <TalentRows feats={feats.data} talents={c.talents} rules={advancement} price={(id, base) => careerPrice(ctx, advancement, "talent", id, base)} available={available} pending={advance.isPending} onBuy={(key) => void advance.buy({ kind: "talent", key })} />
      </HudSection>
      <HudSection title={t("ledger")}>
        <AdvanceLedger ledger={c.ledger} featsById={new Map(feats.data.map((f) => [f.id, f]))} isDM={sheet.viewer.isDM} pending={advance.isPending} onUndo={() => void advance.undo()} />
      </HudSection>
    </div>
  );
}
