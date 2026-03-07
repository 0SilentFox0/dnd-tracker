"use client";

import type { DamagePreviewItem, DamagePreviewResponse } from "./damage-calculator-utils";
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
import { useDamageCalculator } from "@/lib/hooks/useDamageCalculator";

export type { DamagePreviewItem, DamagePreviewResponse };

export interface CharacterDamageCalculatorProps {
  campaignId: string;
  characterId: string;
  level: number;
  scalingCoefficients?: {
    meleeMultiplier?: number;
    rangedMultiplier?: number;
  };
  skillTreeProgress: import("@/lib/hooks/useCharacterView").SkillTreeProgress;
  knownSpellIds: string[];
}

export function CharacterDamageCalculator(props: CharacterDamageCalculatorProps) {
  const {
    damagePreview,
    heroMelee,
    heroRanged,
    meleeDiceSides,
    rangedDiceSides,
    magicDiceSides,
    meleeDiceValues,
    rangedDiceValues,
    magicDiceValues,
    meleeSum,
    rangedSum,
    magicSum,
    setMeleeSum,
    setRangedSum,
    setMagicSum,
    setMeleeDiceAt,
    setRangedDiceAt,
    setMagicDiceAt,
    selectedSpellId,
    setSelectedSpellId,
    knownSpells,
    skillsAffectingDamage,
    skillsAffectingSpell,
    selectedSpell,
  } = useDamageCalculator(props);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Калькулятор шкоди</h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Режим розрахунку</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DamageCalculatorSkillsLog skills={skillsAffectingDamage} />
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
                      {[damagePreview.melee.diceFormula, heroMelee.diceNotation]
                        .filter(Boolean)
                        .join(" + ") || "—"}
                    </span>
                  </p>
                  <DamageCalculatorDiceInputs
                    diceSides={meleeDiceSides}
                    values={meleeDiceValues}
                    onValueChange={setMeleeDiceAt}
                    onCalculate={setMeleeSum}
                    readOnly={false}
                  />
                  <SkillsAffectingDamageList
                    skills={skillsAffectingDamage}
                    mode="melee"
                  />
                  {meleeSum !== null && (
                    <DamageCalculatorResult
                      diceSum={meleeSum}
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
                        heroRanged.diceNotation,
                      ]
                        .filter(Boolean)
                        .join(" + ") || "—"}
                    </span>
                  </p>
                  <DamageCalculatorDiceInputs
                    diceSides={rangedDiceSides}
                    values={rangedDiceValues}
                    onValueChange={setRangedDiceAt}
                    onCalculate={setRangedSum}
                    readOnly={false}
                  />
                  <SkillsAffectingDamageList
                    skills={skillsAffectingDamage}
                    mode="ranged"
                  />
                  {rangedSum !== null && (
                    <DamageCalculatorResult
                      diceSum={rangedSum}
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
                  value={selectedSpellId ?? ""}
                  onValueChange={(v) => setSelectedSpellId(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть заклинання" />
                  </SelectTrigger>
                  <SelectContent>
                    {knownSpells
                      .sort(
                        (a: { level?: number }, b: { level?: number }) =>
                          (a.level ?? 0) - (b.level ?? 0),
                      )
                      .map(
                        (s: { id: string; name: string; level?: number }) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} (рів. {s.level ?? "?"})
                          </SelectItem>
                        ),
                      )}
                  </SelectContent>
                </Select>
              </div>

              {selectedSpell && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Кидки урону:{" "}
                    <span className="font-mono">
                      {selectedSpell.diceCount != null &&
                      selectedSpell.diceType != null
                        ? `${selectedSpell.diceCount}d${selectedSpell.diceType}`
                        : "—"}
                    </span>
                  </p>
                  <DamageCalculatorDiceInputs
                    diceSides={magicDiceSides}
                    values={magicDiceValues}
                    onValueChange={setMagicDiceAt}
                    onCalculate={setMagicSum}
                    readOnly={false}
                  />
                  {magicSum !== null && (
                    <p className="text-lg font-semibold tabular-nums">
                      Сума кидків: {magicSum}
                    </p>
                  )}
                  <SkillsAffectingDamageList
                    skills={skillsAffectingDamage}
                    mode="magic"
                  />
                  {skillsAffectingSpell.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">
                        Бонуси школи магії
                      </p>
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {skillsAffectingSpell.map(
                          (x: { name: string; bonus: number }) => (
                            <li key={x.name}>
                              {x.name}: +{x.bonus}%
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {knownSpells.length === 0 && (
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
