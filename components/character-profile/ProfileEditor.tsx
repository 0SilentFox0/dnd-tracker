"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { BasicEditTab } from "./BasicEditTab";
import { BiographyEditor } from "./BiographyEditor";
import { GoalList } from "./GoalList";
import { LevelUpAction } from "./LevelUpAction";
import { MagicTab } from "./MagicTab";
import { useProfile } from "./ProfileContext";
import { ProfileHero } from "./ProfileHero";
import { type ProfileTabId, ProfileTabs } from "./ProfileTabs";
import { SetList } from "./SetList";
import { SkillsTab } from "./SkillsTab";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { CharacterChoicesPanel } from "@/components/choices/CharacterChoicesPanel";
import { ActionBar } from "@/components/common/ActionBar";
import { FormAlert } from "@/components/common/states";
import { LoadingState } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { SPELL_ABILITY_OPTIONS, toSpellcastingAbility } from "@/lib/constants/abilities";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useCharacterRoster, useDmCharacterEditor } from "@/lib/hooks/characters";

export function ProfileEditor({ onDone }: { onDone: () => void }) {
  const { campaignId, characterId, sheet } = useProfile();

  const router = useRouter();

  const t = useTranslations("characterProfile");

  const tc = useTranslations("common.tabs");

  const editor = useDmCharacterEditor({ campaignId, characterId, onSaved: onDone });

  const [tab, setTab] = useState<ProfileTabId>("basic");

  const classesEnabled = !!useCampaignRules(campaignId).data?.classes.enabled;

  const roster = useCharacterRoster(campaignId);

  const holders = useMemo(() => {
    const map: Record<string, string> = {};

    for (const hero of roster.data ?? []) {
      if (hero.id === characterId) continue;

      for (const item of Object.values(hero.equipped)) if (!item.gear) map[item.id] = hero.name;
    }

    return map;
  }, [roster.data, characterId]);

  if (!editor.ready) return <LoadingState rows={6} label={t("editor.loading")} />;

  const { form, equipped, setEquipped, artifacts } = editor;

  const { formData, abilityScores, combatStats, skills, abilities, spellcasting } = form;

  const heroClasses = (formData.basicInfo.classes ?? []).filter((e) => e.classId);

  const heroClassMode = classesEnabled && heroClasses.length > 0;

  const showChoices = heroClassMode || !!sheet.choices;

  return (
    <form id="profile-edit" className="hud-form" onSubmit={form.actions.handleSubmit}>
      <ProfileHero
        actions={
          <LevelUpAction
            level={formData.basicInfo.level}
            maxLevel={sheet.maxLevel}
            onLevelUp={() => void editor.dmActions.levelUp()}
            classLevelUp={
              classesEnabled && (formData.basicInfo.classes ?? []).length > 0
                ? { character: { campaignId, id: characterId, entries: formData.basicInfo.classes ?? [], hero: { race: formData.basicInfo.race, level: formData.basicInfo.level, scores: abilityScores.data, skills: skills.data.skills } }, onLeveled: editor.dmActions.applyClassLevelUp }
                : undefined
            }
          />
        }
      />
      {form.status.error && (
        <FormAlert className="mx-4">{form.status.error}</FormAlert>
      )}
      <ProfileTabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { id: "basic", label: tc("basic"), content: <BasicEditTab editor={editor} onDeleted={() => router.push(`/campaigns/${campaignId}/dm/characters`)} /> },
          {
            id: "combat",
            label: t("tabs.combat"),
            content: (
              <div className="space-y-6">
                <CharacterAbilityScores abilityScores={abilityScores} withPrimary />
                <CharacterCombatParams campaignId={campaignId} combatStats={combatStats} classArmor={classesEnabled && (formData.basicInfo.classes ?? []).length > 0 ? sheet.armorClass : undefined} />
                <CharacterSkillsSection skills={skills} />
              </div>
            ),
          },
          {
            id: "skills",
            label: t("tabs.skills"),
            content: (
              <div className="space-y-4">
                <CharacterAbilitiesSection campaignId={campaignId} abilities={abilities} />
                <SkillsTab manage />
              </div>
            ),
          },
          ...(showChoices
            ? [
                {
                  id: "choices" as const,
                  label: tc("choices"),
                  content: (
                    <CharacterChoicesPanel
                      campaignId={campaignId}
                      characterId={characterId}
                      initial={{ backgroundId: formData.choices?.backgroundId, backgroundChoices: formData.choices?.backgroundChoices, backgroundFeatPicks: formData.choices?.backgroundFeatPicks, raceChoices: formData.choices?.raceChoices ?? {}, feats: formData.choices?.feats ?? [], classes: heroClasses }}
                      hero={{ race: formData.basicInfo.race, level: formData.basicInfo.level, scores: abilityScores.data, skills: skills.data.skills, classMode: heroClassMode }}
                      onSaved={editor.dmActions.applyClassLevelUp}
                    />
                  ),
                },
              ]
            : []),
          {
            id: "magic",
            label: t("tabs.magic"),
            content: (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="spellcastingAbility">{t("editor.spellAbility")}</Label>
                  <SelectField
                    id="spellcastingAbility"
                    value={spellcasting.data.spellcastingAbility ?? ""}
                    onValueChange={(v) => spellcasting.set("spellcastingAbility", toSpellcastingAbility(v))}
                    options={SPELL_ABILITY_OPTIONS}
                    allowNone
                    noneLabel={t("editor.none")}
                  />
                  <p className="text-xs text-muted-foreground">{t("editor.spellAbilityHint")}</p>
                </div>
                <MagicTab />
              </div>
            ),
          },
          {
            id: "items",
            label: t("tabs.things"),
            content: (
              <div className="space-y-4">
                <CharacterArtifactsSection
                  campaignId={campaignId}
                  characterId={characterId}
                  equipped={equipped}
                  artifacts={artifacts.map((a) => ({ id: a.id, name: a.name, slot: a.slot ?? "item", icon: a.icon ?? null, modifiers: a.modifiers }))}
                  holders={holders}
                  onEquippedChange={setEquipped}
                />
                {sheet.items.sets.length > 0 && (
                  <HudSection title={t("sets.title")}>
                    <SetList sets={sheet.items.sets} />
                  </HudSection>
                )}
              </div>
            ),
          },
          {
            id: "story",
            label: t("tabs.story"),
            content: (
              <div className="space-y-6">
                <GoalList />
                <BiographyEditor value={formData.basicInfo.background ?? ""} onChange={(v) => form.basicInfo.set("background", v)} />
              </div>
            ),
          },
        ]}
      />
      <ActionBar className="bg-[#110e0b]/95 px-4">
        <Button type="button" variant="outline" onClick={onDone}>
          {t("editor.cancel")}
        </Button>
        <Button type="submit" form="profile-edit" disabled={form.status.isLoading || editor.options.membersLoading}>
          {form.status.isLoading ? t("editor.saving") : t("editor.save")}
        </Button>
      </ActionBar>
    </form>
  );
}
