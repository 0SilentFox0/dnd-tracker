"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { SkillTriggersEditor } from "./SkillTriggersEditor";
import { SkillBasicInfo } from "./SkillBasicInfo";
import { SkillBonuses } from "./SkillBonuses";
import { SkillCombatStats } from "./SkillCombatStats";
import { SkillMainSkillSection } from "./SkillMainSkillSection";
import { SkillSpellSection } from "./SkillSpellSection";
import { useSkillForm } from "@/lib/hooks/useSkillForm";
import type { SkillTriggers } from "@/types/skill-triggers";

interface SpellOption {
  id: string;
  name: string;
}

interface SpellGroupOption {
  id: string;
  name: string;
}

import type { Race } from "@/types/races";

import type { Skill, GroupedSkill } from "@/types/skills";

interface SkillCreateFormProps {
  campaignId: string;
  spells: SpellOption[];
  spellGroups?: SpellGroupOption[]; // Зарезервовано для майбутнього використання
  initialRaces?: Race[];
  // Підтримуємо обидві структури для сумісності
  initialData?: Skill | GroupedSkill | {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    races: unknown;
    isRacial: boolean;
    bonuses: unknown;
    damage: number | null;
    armor: number | null;
    speed: number | null;
    physicalResistance: number | null;
    magicalResistance: number | null;
    spellId: string | null;
    spellGroupId: string | null;
    mainSkillId: string | null;
    spellEnhancementTypes?: unknown;
    spellEffectIncrease?: number | null;
    spellTargetChange?: unknown;
    spellAdditionalModifier?: unknown;
    spellNewSpellId?: string | null;
    skillTriggers?: SkillTriggers;
  };
}

export function SkillCreateForm({
  campaignId,
  spells,
  initialRaces = [],
  initialData,
}: SkillCreateFormProps) {
  const router = useRouter();
  
  const {
    isSaving,
    error,
    isEdit,
    mainSkills,
    races,
    basicInfo,
    bonuses,
    combatStats,
    spell,
    spellEnhancement,
    mainSkill,
    skillTriggers: skillTriggersGroup,
    handleSubmit,
  } = useSkillForm(campaignId, spells, initialRaces, initialData);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Редагувати скіл" : "Створити скіл"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Оновіть інформацію про скіл"
            : "Додайте новий скіл з його характеристиками та ефектами"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <SkillBasicInfo
            basicInfo={basicInfo}
            races={races}
          />

          <SkillBonuses bonuses={bonuses} />

          <SkillCombatStats combatStats={combatStats} />

          <SkillSpellSection
            spell={spell}
            spellEnhancement={spellEnhancement}
            spells={spells}
          />

          <SkillMainSkillSection
            mainSkill={mainSkill}
            mainSkills={mainSkills}
          />

          <SkillTriggersEditor
            triggers={skillTriggersGroup.skillTriggers}
            onChange={skillTriggersGroup.setters.setSkillTriggers}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? isEdit
                  ? "Збереження..."
                  : "Створення..."
                : isEdit
                ? "Зберегти зміни"
                : "Створити скіл"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/campaigns/${campaignId}/dm/skills`)}
              disabled={isSaving}
            >
              Скасувати
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
