/**
 * Компонент для бойових параметрів персонажа
 */

import { Fragment } from "react";

import { ArtifactDeltaBadge } from "@/components/characters/stats/ArtifactDeltaBadge";
import { LabeledInput } from "@/components/ui/labeled-input";

export type CharacterCombatArtifactBonuses = {
  armorClass?: number;
  initiative?: number;
  speed?: number;
  minTargets?: number;
  maxTargets?: number;
  morale?: number;
  spellSlotBonusByLevel?: Record<string, number>;
};

interface CharacterCombatParamsProps {
  /** Плоскі бонуси з екіпірованих артефактів (носій). */
  artifactBonuses?: CharacterCombatArtifactBonuses;
  combatStats: {
    armorClass: number;
    initiative: number;
    speed: number;
    hitDice: string;
    minTargets: number;
    maxTargets: number;
    morale: number;
    setters: {
      setArmorClass: (value: number) => void;
      setInitiative: (value: number) => void;
      setSpeed: (value: number) => void;
      setHitDice: (value: string) => void;
      setMinTargets: (value: number) => void;
      setMaxTargets: (value: number) => void;
      setMorale: (value: number) => void;
    };
  };
}

export function CharacterCombatParams({
  artifactBonuses,
  combatStats,
}: CharacterCombatParamsProps) {
  const {
    armorClass,
    initiative,
    speed,
    hitDice,
    minTargets,
    maxTargets,
    morale,
    setters,
  } = combatStats;

  const slotBonuses = artifactBonuses?.spellSlotBonusByLevel ?? {};

  const slotBonusEntries = Object.entries(slotBonuses).filter(
    ([, n]) => typeof n === "number" && n !== 0,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      <LabeledInput
        id="armorClass"
        label="Клас Броні (AC)"
        labelExtra={
          artifactBonuses ? (
            <ArtifactDeltaBadge value={artifactBonuses.armorClass ?? 0} />
          ) : null
        }
        type="number"
        min="0"
        value={armorClass}
        onChange={(e) => setters.setArmorClass(parseInt(e.target.value) || 10)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="initiative"
        label="Ініціатива"
        labelExtra={
          artifactBonuses ? (
            <ArtifactDeltaBadge value={artifactBonuses.initiative ?? 0} />
          ) : null
        }
        type="number"
        value={initiative}
        onChange={(e) => setters.setInitiative(parseInt(e.target.value) || 0)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="speed"
        label="Швидкість"
        labelExtra={
          artifactBonuses ? (
            <ArtifactDeltaBadge value={artifactBonuses.speed ?? 0} />
          ) : null
        }
        type="number"
        min="0"
        value={speed}
        onChange={(e) => setters.setSpeed(parseInt(e.target.value) || 30)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="hitDice"
        label="Кістки Здоров'я"
        value={hitDice}
        onChange={(e) => setters.setHitDice(e.target.value)}
        placeholder="1d8"
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="minTargets"
        label="Мін. цілей"
        labelExtra={
          artifactBonuses ? (
            <ArtifactDeltaBadge value={artifactBonuses.minTargets ?? 0} />
          ) : null
        }
        type="number"
        min="1"
        value={minTargets}
        onChange={(e) => setters.setMinTargets(parseInt(e.target.value) || 1)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="maxTargets"
        label="Макс. цілей"
        labelExtra={
          artifactBonuses ? (
            <ArtifactDeltaBadge value={artifactBonuses.maxTargets ?? 0} />
          ) : null
        }
        type="number"
        min="1"
        value={maxTargets}
        onChange={(e) => setters.setMaxTargets(parseInt(e.target.value) || 1)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="morale"
        label="Мораль"
        labelExtra={
          artifactBonuses ? (
            <ArtifactDeltaBadge value={artifactBonuses.morale ?? 0} />
          ) : null
        }
        type="number"
        min="-3"
        max="3"
        value={morale}
        onChange={(e) => setters.setMorale(parseInt(e.target.value) || 0)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      </div>
      {slotBonusEntries.length > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Додаткові слоти від артефактів:
          </span>{" "}
          {slotBonusEntries.map(([lvl, n], i) => (
            <Fragment key={lvl}>
              {i > 0 ? ", " : null}
              <span
                className={
                  n > 0
                    ? "font-medium text-green-600 dark:text-green-500"
                    : "font-medium text-red-600 dark:text-red-500"
                }
              >
                рівень {lvl}: {n > 0 ? `+${n}` : n}
              </span>
            </Fragment>
          ))}
        </p>
      )}
    </div>
  );
}
