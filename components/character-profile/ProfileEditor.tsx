"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BasicEditTab } from "./BasicEditTab";
import { BiographyEditor } from "./BiographyEditor";
import { GoalList } from "./GoalList";
import { MagicTab } from "./MagicTab";
import { useProfile } from "./ProfileContext";
import { ProfileHero } from "./ProfileHero";
import { type ProfileTabId, ProfileTabs } from "./ProfileTabs";
import { Section } from "./Section";
import { SetList } from "./SetList";
import { SkillsTab } from "./SkillsTab";
import { SPELL_ABILITY_OPTIONS, toSpellcastingAbility } from "./spellcasting-ability";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { ActionBar } from "@/components/common/ActionBar";
import { LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useDmCharacterEditor } from "@/lib/hooks/characters";


const EDIT_PANEL = "rounded-lg bg-background p-3 text-foreground";

export function ProfileEditor({ onDone }: { onDone: () => void }) {
  const { campaignId, characterId, sheet } = useProfile();

  const router = useRouter();

  const editor = useDmCharacterEditor({ campaignId, characterId, onSaved: onDone });

  const [tab, setTab] = useState<ProfileTabId>("basic");

  if (!editor.ready) return <LoadingState rows={6} label="Завантаження редактора…" />;

  const { form, equipped, setEquipped, artifacts } = editor;

  const { formData, setFormData, abilityScores, combatStats, skills, abilities, spellcasting } = form;

  return (
    <form id="profile-edit" onSubmit={form.handleSubmit}>
      <ProfileHero
        actions={
          <Button type="button" size="sm" variant="outline" onClick={() => void editor.levelUp()}>
            + рівень
          </Button>
        }
      />
      {form.error && <p className="mx-4 rounded border border-[#9c2a1d] bg-[#9c2a1d]/15 px-3 py-2 text-sm">{form.error}</p>}
      <ProfileTabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { id: "basic", label: "Основне", content: <div className={EDIT_PANEL}><BasicEditTab editor={editor} onDeleted={() => router.push(`/campaigns/${campaignId}/dm/characters`)} /></div> },
          {
            id: "combat",
            label: "Бій",
            content: (
              <div className={`${EDIT_PANEL} space-y-6`}>
                <CharacterAbilityScores abilityScores={abilityScores} primary={{ value: abilityScores.primaryAbility, onChange: abilityScores.setters.setPrimaryAbility }} />
                <CharacterCombatParams combatStats={combatStats} />
                <CharacterSkillsSection skills={skills} />
              </div>
            ),
          },
          {
            id: "skills",
            label: "Вміння",
            content: (
              <div className="space-y-4">
                <div className={EDIT_PANEL}>
                  <CharacterAbilitiesSection campaignId={campaignId} abilities={abilities} />
                </div>
                <SkillsTab manage />
              </div>
            ),
          },
          {
            id: "magic",
            label: "Магія",
            content: (
              <div className="space-y-4">
                <div className={`${EDIT_PANEL} space-y-2`}>
                  <Label htmlFor="spellcastingAbility">Характеристика заклинань</Label>
                  <SelectField
                    id="spellcastingAbility"
                    value={spellcasting.spellcastingAbility ?? ""}
                    onValueChange={(v) => spellcasting.setters.setSpellcastingAbility(toSpellcastingAbility(v))}
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
                <div className={EDIT_PANEL}>
                  <CharacterArtifactsSection
                    campaignId={campaignId}
                    characterId={characterId}
                    equipped={equipped}
                    artifacts={artifacts.map((a) => ({ id: a.id, name: a.name, slot: a.slot ?? "item", icon: a.icon ?? null }))}
                    onEquippedChange={setEquipped}
                  />
                </div>
                {sheet.items.sets.length > 0 && (
                  <Section title="СЕТИ">
                    <SetList sets={sheet.items.sets} />
                  </Section>
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
                <BiographyEditor value={formData.basicInfo.background ?? ""} onChange={(v) => setFormData((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, background: v } }))} />
              </div>
            ),
          },
        ]}
      />
      <ActionBar className="bg-[#110e0b]/95 px-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Скасувати
        </Button>
        <Button type="submit" form="profile-edit" disabled={form.loading || editor.membersLoading}>
          {form.loading ? "Збереження…" : "Зберегти"}
        </Button>
      </ActionBar>
    </form>
  );
}
