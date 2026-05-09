"use client";

import type {
  DamagePreviewItem,
  DamagePreviewResponse,
} from "./damage-calculator-utils";
import { DamageCalculatorDiceInputs } from "./DamageCalculatorDiceInputs";
import { DamageCalculatorResult } from "./DamageCalculatorResult";
import { DamageCalculatorSkillsLog } from "./DamageCalculatorSkillsLog";
import { SkillsAffectingDamageList } from "./SkillsAffectingDamageList";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDamageCalculator } from "@/lib/hooks/characters";
import { formatSpellDamageDiceRoll } from "@/lib/utils/spells/spell-calculations";

export type { DamagePreviewItem, DamagePreviewResponse };

export interface CharacterDamageCalculatorProps {
  campaignId: string;
  characterId: string;
  level: number;
  scalingCoefficients?: {
    meleeMultiplier?: number;
    rangedMultiplier?: number;
  };
  skillTreeProgress: import("@/lib/hooks/characters").SkillTreeProgress;
  characterRace?: string;
  knownSpellIds: string[];
}

export function CharacterDamageCalculator(
  props: CharacterDamageCalculatorProps
) {
  const {
    damagePreview,
    magicPreview,
    magicPreviewFetching,
    hero,
    dice,
    spell,
    skills,
  } = useDamageCalculator(props);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Калькулятор шкоди</h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Режим розрахунку</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DamageCalculatorSkillsLog skills={skills.affectingDamage} />
          <Tabs defaultValue="melee" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="melee">Ближній бій</TabsTrigger>
              <TabsTrigger value="ranged">Дальній бій</TabsTrigger>
              <TabsTrigger value="magic">Магія</TabsTrigger>
            </TabsList>

            <TabsContent value="melee" className="mt-4 space-y-3">
              {damagePreview ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Кидки:{" "}
                    <span className="font-mono">
                      {[
                        damagePreview.melee.diceFormula,
                        hero.heroMelee.diceNotation,
                      ]
                        .filter(Boolean)
                        .join(" + ") || "—"}
                    </span>
                  </p>
                  <DamageCalculatorDiceInputs
                    key={`melee-${
                      dice.melee.sides.length
                        ? dice.melee.sides.join(",")
                        : "empty"
                    }`}
                    diceSides={dice.melee.sides}
                    onSubmitRolls={dice.melee.submitRolls}
                    readOnly={false}
                    logTag="melee"
                  />
                  <SkillsAffectingDamageList
                    skills={skills.affectingDamage}
                    mode="melee"
                  />
                  {dice.melee.sum !== null && (
                    <DamageCalculatorResult
                      diceSum={dice.melee.sum}
                      breakdown={damagePreview.melee.breakdown}
                      total={damagePreview.melee.total}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Завантаження…</p>
              )}
            </TabsContent>

            <TabsContent value="ranged" className="mt-4 space-y-3">
              {damagePreview ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Кидки:{" "}
                    <span className="font-mono">
                      {[
                        damagePreview.ranged.diceFormula,
                        hero.heroRanged.diceNotation,
                      ]
                        .filter(Boolean)
                        .join(" + ") || "—"}
                    </span>
                  </p>
                  <DamageCalculatorDiceInputs
                    key={`ranged-${
                      dice.ranged.sides.length
                        ? dice.ranged.sides.join(",")
                        : "empty"
                    }`}
                    diceSides={dice.ranged.sides}
                    onSubmitRolls={dice.ranged.submitRolls}
                    readOnly={false}
                    logTag="ranged"
                  />
                  <SkillsAffectingDamageList
                    skills={skills.affectingDamage}
                    mode="ranged"
                  />
                  {dice.ranged.sum !== null && (
                    <DamageCalculatorResult
                      diceSum={dice.ranged.sum}
                      breakdown={damagePreview.ranged.breakdown}
                      total={damagePreview.ranged.total}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Завантаження…</p>
              )}
            </TabsContent>

            <TabsContent value="magic" className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Заклинання
                </label>
                <Select
                  value={spell.selectedSpellId ?? ""}
                  onValueChange={(v) => spell.setSelectedSpellId(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть заклинання" />
                  </SelectTrigger>
                  <SelectContent>
                    {spell.knownSpells
                      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name ?? "—"} (рів. {s.level ?? "?"})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {spell.selectedSpell && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Кидки:{" "}
                    <span className="font-mono">
                      {formatSpellDamageDiceRoll(
                        spell.selectedSpell.diceCount,
                        spell.selectedSpell.diceType
                      ) ?? "—"}
                    </span>
                  </p>
                  <DamageCalculatorDiceInputs
                    key={`magic-${
                      dice.magic.sides.length
                        ? dice.magic.sides.join(",")
                        : "empty"
                    }`}
                    diceSides={dice.magic.sides}
                    onSubmitRolls={dice.magic.submitRolls}
                    readOnly={false}
                    logTag="magic"
                  />
                  {dice.magic.sum !== null && magicPreview && (
                    <DamageCalculatorResult
                      diceSum={dice.magic.sum}
                      breakdown={magicPreview.breakdown ?? []}
                      total={magicPreview.total}
                      spellEffectKind={magicPreview.spellEffectKind}
                    />
                  )}
                  {dice.magic.sum !== null &&
                    magicPreviewFetching &&
                    !magicPreview && (
                      <p className="text-sm text-muted-foreground">
                        Розрахунок заклинання…
                      </p>
                    )}
                  {dice.magic.sum !== null &&
                    !magicPreviewFetching &&
                    !magicPreview &&
                    spell.selectedSpell &&
                    (spell.selectedSpell.damageType === "damage" ||
                      spell.selectedSpell.damageType === "heal" ||
                      spell.selectedSpell.damageType === "all") && (
                      <p className="text-sm text-muted-foreground">
                        Не вдалося отримати розрахунок заклинання. Спробуйте ще
                        раз.
                      </p>
                    )}
                  {dice.magic.sum !== null &&
                    !magicPreviewFetching &&
                    !magicPreview &&
                    spell.selectedSpell &&
                    !(
                      spell.selectedSpell.damageType === "damage" ||
                      spell.selectedSpell.damageType === "heal" ||
                      spell.selectedSpell.damageType === "all"
                    ) && (
                      <p className="text-sm text-muted-foreground">
                        Сума кидків: {dice.magic.sum} (для цього типу ефекту
                        повний розрахунок не застосовується)
                      </p>
                    )}
                  <SkillsAffectingDamageList
                    skills={skills.affectingDamage}
                    mode="magic"
                  />
                  {skills.affectingSpell.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">
                        Бонуси школи магії
                      </p>
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {skills.affectingSpell.map(
                          (x: { name: string; bonus: number }) => (
                            <li key={x.name}>
                              {x.name}: +{x.bonus}%
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {spell.knownSpells.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Немає вивчених заклинань.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
