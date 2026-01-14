"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import Link from "next/link";
import { useCharacterForm } from "@/lib/hooks/useCharacterForm";
import { useCampaignMembers } from "@/lib/hooks/useCampaignMembers";
import { getCharacter, updateCharacter, Character } from "@/lib/api/characters";
import { CharacterBasicInfo } from "@/components/characters/CharacterBasicInfo";
import { CharacterAbilityScores } from "@/components/characters/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/CharacterCombatParams";
import { CharacterSkillsSection } from "@/components/characters/CharacterSkillsSection";
import { CharacterSpellsSection } from "@/components/characters/CharacterSpellsSection";
import { CharacterLanguagesSection } from "@/components/characters/CharacterLanguagesSection";
import { CharacterRoleplaySection } from "@/components/characters/CharacterRoleplaySection";

export default function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string; characterId: string }>;
}) {
  const { id, characterId } = use(params);
  const router = useRouter();
  const { members, loading: membersLoading } = useCampaignMembers(id);

  const {
    formData,
    loading,
    error,
    updateField,
    toggleSavingThrow,
    toggleSkill,
    addLanguage,
    removeLanguage,
    addKnownSpell,
    removeKnownSpell,
    handleSubmit,
    setFormData,
  } = useCharacterForm({
    onSubmit: async (data) => {
      await updateCharacter(id, characterId, data);
      router.push(`/campaigns/${id}/dm/characters`);
    },
  });

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const character: Character = await getCharacter(id, characterId);
        setFormData({
          name: character.name,
          type: character.type as "player" | "npc_hero",
          controlledBy: character.controlledBy,
          level: character.level,
          class: character.class,
          subclass: character.subclass || "",
          race: character.race,
          subrace: character.subrace || "",
          alignment: character.alignment || "",
          background: character.background || "",
          experience: character.experience,
          avatar: character.avatar || "",
          strength: character.strength,
          dexterity: character.dexterity,
          constitution: character.constitution,
          intelligence: character.intelligence,
          wisdom: character.wisdom,
          charisma: character.charisma,
          armorClass: character.armorClass,
          initiative: character.initiative,
          speed: character.speed,
          maxHp: character.maxHp,
          currentHp: character.currentHp,
          tempHp: character.tempHp,
          hitDice: character.hitDice,
          savingThrows: character.savingThrows || {},
          skills: character.skills || {},
          spellcastingClass: character.spellcastingClass || "",
          spellcastingAbility: character.spellcastingAbility || undefined,
          spellSlots: {},
          knownSpells: character.knownSpells || [],
          languages: character.languages || [],
          proficiencies: character.proficiencies || {},
          personalityTraits: character.personalityTraits || "",
          ideals: character.ideals || "",
          bonds: character.bonds || "",
          flaws: character.flaws || "",
        });
      } catch (err) {
        console.error("Error fetching character:", err);
      }
    };

    fetchCharacter();
  }, [id, characterId, setFormData]);

  if (loading && !formData.name) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Завантаження...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <Link href={`/campaigns/${id}/dm/characters`}>
          <Button variant="ghost">← Назад</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Редагувати персонажа: {formData.name || "Завантаження..."}</CardTitle>
          <CardDescription>Оновіть інформацію про персонажа</CardDescription>
        </CardHeader>
        <CardContent className="w-full overflow-hidden">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Помилка:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            <Accordion>
              <AccordionItem defaultOpen>
                <AccordionTrigger>1. Загальна інформація</AccordionTrigger>
                <AccordionContent>
                  <CharacterBasicInfo
                    formData={formData}
                    onUpdate={updateField}
                    campaignMembers={members}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem>
                <AccordionTrigger>2. Основні характеристики</AccordionTrigger>
                <AccordionContent>
                  <CharacterAbilityScores formData={formData} onUpdate={updateField} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem>
                <AccordionTrigger>3. Бойові параметри</AccordionTrigger>
                <AccordionContent>
                  <CharacterCombatParams formData={formData} onUpdate={updateField} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem>
                <AccordionTrigger>4. Навички та Збереження</AccordionTrigger>
                <AccordionContent>
                  <CharacterSkillsSection
                    formData={formData}
                    onToggleSavingThrow={toggleSavingThrow}
                    onToggleSkill={toggleSkill}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem>
                <AccordionTrigger>5. Заклинання</AccordionTrigger>
                <AccordionContent>
                  <CharacterSpellsSection
                    formData={formData}
                    campaignId={id}
                    onUpdate={updateField}
                    onAddSpell={addKnownSpell}
                    onRemoveSpell={removeKnownSpell}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem>
                <AccordionTrigger>6. Мови та Профісії</AccordionTrigger>
                <AccordionContent>
                  <CharacterLanguagesSection
                    formData={formData}
                    onUpdate={updateField}
                    onAddLanguage={addLanguage}
                    onRemoveLanguage={removeLanguage}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem>
                <AccordionTrigger>7. Рольова гра</AccordionTrigger>
                <AccordionContent>
                  <CharacterRoleplaySection formData={formData} onUpdate={updateField} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading || membersLoading}>
                {loading ? "Збереження..." : "Зберегти зміни"}
              </Button>
              <Link href={`/campaigns/${id}/dm/characters`}>
                <Button type="button" variant="outline">
                  Скасувати
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
