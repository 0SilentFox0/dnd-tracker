"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { ChargesList } from "./rest/ChargesList";
import { ClassLevelUpDialog } from "./ClassLevelUpDialog";
import { FeatsBlock } from "./FeatsBlock";
import type { ClassLevelUpProps } from "./LevelUpAction";
import { BackgroundSection, CharacterPath, ClassesHeader, ClassSection, SpellPicksNudge } from "./path";
import { useProfile } from "./ProfileContext";
import { RacePassive } from "./RacePassive";

import { EntityIcon } from "@/components/common/EntityIcon";
import { ProgressionPanel } from "@/components/skill-tree/progression";
import { classSectionOpen } from "@/lib/utils/characters/classes/path";

const ChoicesDialog = dynamic(() => import("./ChoicesDialog"), { ssr: false });

export function SkillsTab({ manage = false, classLevelUp }: { manage?: boolean; classLevelUp?: ClassLevelUpProps }) {
  const { campaignId, characterId, sheet } = useProfile();

  const t = useTranslations("characterProfile.skills");

  const personal = sheet.personalSkill;

  const [choices, setChoices] = useState<{ startAt?: string } | null>(null);

  const [addingClass, setAddingClass] = useState(false);

  const names = Object.fromEntries([...sheet.spells.map((sp) => [sp.id, sp.name]), ...(sheet.choices?.feats ?? []).map((f) => [f.id, f.name])]);

  const openChoices = (pickKey?: string) => setChoices({ startAt: pickKey });

  const actions = sheet.choices?.canEdit ? { onPick: openChoices } : undefined;

  return (
    <>
      <SpellPicksNudge onPick={actions && (() => openChoices())} />
      {sheet.classProgression && sheet.classProgression.length > 0 ? <BackgroundSection background={sheet.choices?.background} canEdit={!!sheet.choices?.canEdit} onOpen={openChoices} /> : null}
      {sheet.classProgression && sheet.classProgression.length > 0 ? <ClassesHeader progressions={sheet.classProgression} maxLevel={sheet.maxLevel} onAddClass={classLevelUp ? () => setAddingClass(true) : undefined} /> : null}
      {sheet.classProgression?.map((progression) => (
        <ClassSection key={progression.classId} progression={progression} defaultOpen={classSectionOpen(sheet.classProgression ?? [], progression)}>
          <CharacterPath progression={progression} actions={actions} names={names} />
        </ClassSection>
      ))}
      {classLevelUp && addingClass ? <ClassLevelUpDialog open onOpenChange={setAddingClass} startNew {...classLevelUp} /> : null}
      {choices ? <ChoicesDialog open onOpenChange={(o) => !o && setChoices(null)} campaignId={campaignId} characterId={characterId} startAt={choices.startAt} /> : null}
      <FeatsBlock />
      <RacePassive />
      <ChargesList />
      {personal && (
        <section className="mb-3 flex gap-3 rounded-[10px] border border-hud-gold/40 bg-hud-field p-3">
          <EntityIcon src={sheet.identity.avatar || personal.icon} name={personal.name} alt={sheet.identity.name} size={48} className="hud-sc size-12 rounded-md border border-hud-line bg-[#2a2016] text-inherit" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase text-hud-gold">{t("personal")}</p>
            <h3 className="hud-sc text-base text-hud-ink">{personal.name}</h3>
            {personal.description && <p className="mt-1 text-[13px] leading-snug text-[#b8ab95]">{personal.description}</p>}
          </div>
        </section>
      )}
      {!sheet.classProgression?.length && (
        <div className="-mx-4">
          <ProgressionPanel campaignId={campaignId} characterId={characterId} canManage={manage} />
        </div>
      )}
    </>
  );
}
