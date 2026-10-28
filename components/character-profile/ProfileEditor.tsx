"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
import { ActionBar } from "@/components/common/ActionBar";
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

  const editor = useDmCharacterEditor({ campaignId, characterId, onSaved: onDone });

  const [tab, setTab] = useState<ProfileTabId>("basic");

  const classesEnabled = !!useCampaignRules(campaignId).data?.classes.enabled;

  const roster = useCharacterRoster(campaignId);

  const holders = useMemo(() => {
    const map: Record<string, string> = {};

    for (const hero of roster.data ?? []) {
      if (hero.id === characterId) continue;

      for (const item of Object.values(hero.equipped)) map[item.id] = hero.name;
    }

    return map;
  }, [roster.data, characterId]);

  if (!editor.ready) return <LoadingState rows={6} label="Завантаження редактора…" />;

  const { form, equipped, setEquipped, artifacts } = editor;

  const { formData, abilityScores, combatStats, skills, abilities, spellcasting } = form;

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
                ? { character: { campaignId, id: characterId, entries: formData.basicInfo.classes ?? [] }, onLeveled: editor.dmActions.applyClassLevelUp }
                : undefined
            }
          />
        }
      />
      {form.status.error && (
        <p role="alert" className="mx-4 rounded-md border border-hud-danger/50 bg-hud-danger/10 px-3 py-2 text-sm text-[#f0b4a6]">
          {form.status.error}
        </p>
      )}
      <ProfileTabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { id: "basic", label: "Основне", content: <BasicEditTab editor={editor} onDeleted={() => router.push(`/campaigns/${campaignId}/dm/characters`)} /> },
          {
            id: "combat",
            label: "Бій",
            content: (
              <div className="space-y-6">
                <CharacterAbilityScores abilityScores={abilityScores} withPrimary />
                <CharacterCombatParams campaignId={campaignId} combatStats={combatStats} />
                <CharacterSkillsSection skills={skills} />
              </div>
            ),
          },
          {
            id: "skills",
            label: "Вміння",
            content: (
              <div className="space-y-4">
                <CharacterAbilitiesSection campaignId={campaignId} abilities={abilities} />
                <SkillsTab manage />
              </div>
            ),
          },
          {
            id: "magic",
            label: "Магія",
            content: (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="spellcastingAbility">Характеристика заклинань</Label>
                  <SelectField
                    id="spellcastingAbility"
                    value={spellcasting.data.spellcastingAbility ?? ""}
                    onValueChange={(v) => spellcasting.set("spellcastingAbility", toSpellcastingAbility(v))}
                    options={SPELL_ABILITY_OPTIONS}
                    allowNone
                    noneLabel="Немає"
                  />
                  <p className="text-xs text-muted-foreground">Від неї СЛ і атака заклинанням у профілі.</p>
                </div>
                <MagicTab />
              </div>
            ),
          },
          {
            id: "items",
            label: "Речі",
            content: (
              <div className="space-y-4">
                <CharacterArtifactsSection
                  campaignId={campaignId}
                  characterId={characterId}
                  equipped={equipped}
                  artifacts={artifacts.map((a) => ({ id: a.id, name: a.name, slot: a.slot ?? "item", icon: a.icon ?? null }))}
                  holders={holders}
                  onEquippedChange={setEquipped}
                />
                {sheet.items.sets.length > 0 && (
                  <HudSection title="СЕТИ">
                    <SetList sets={sheet.items.sets} />
                  </HudSection>
                )}
              </div>
            ),
          },
          {
            id: "story",
            label: "Історія",
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
          Скасувати
        </Button>
        <Button type="submit" form="profile-edit" disabled={form.status.isLoading || editor.options.membersLoading}>
          {form.status.isLoading ? "Збереження…" : "Зберегти"}
        </Button>
      </ActionBar>
    </form>
  );
}
