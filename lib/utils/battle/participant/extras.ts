/**
 * Розширені дані учасника (extras): резисти, пороги, прапорці
 */

import type { BattleParticipant } from "@/types/battle";

export interface ParticipantResistances {
  physical?: number;
  spell?: number;
}

export interface ParticipantExtras {
  critThreshold?: number;
  maxSpellLevel?: number;
  minMorale?: number;
  enemyAttackDisadvantage?: boolean;
  advantageOnAllRolls?: boolean;
  /** Перевага лише на кидки дальньої атаки (пасив сету / скілу). */
  advantageOnRangedAttacks?: boolean;
  spellTargetsLvl45?: number;
  lightSpellsTargetAllAllies?: boolean;
  controlUnits?: number;
  moralePerKill?: number;
  moralePerAllyDeath?: number;
  resistances?: ParticipantResistances;
  skillUsageCounts?: Record<string, number>;
  /** ID заклинань кампанії, до яких учасник імунний (наприклад з effectScope сету/артефакта). */
  immuneSpellIds?: string[];
}

/** Отримує розширені дані з battleData */
export function getParticipantExtras(
  participant: BattleParticipant,
): ParticipantExtras {
  return (
    ((participant.battleData as unknown as Record<string, unknown>)
      .extras as ParticipantExtras) ?? {}
  );
}

/** Зберігає розширені дані в battleData */
export function setParticipantExtras(
  participant: BattleParticipant,
  extras: ParticipantExtras,
): void {
  (participant.battleData as unknown as Record<string, unknown>).extras =
    extras;
}

export function mergeParticipantImmuneSpellIds(
  participant: BattleParticipant,
  ids: string[] | undefined,
): void {
  if (!ids?.length) return;

  const ext = getParticipantExtras(participant);

  ext.immuneSpellIds = [...new Set([...(ext.immuneSpellIds ?? []), ...ids])];
  setParticipantExtras(participant, ext);
}

/** Отримує резисти учасника з extras */
export function getParticipantResistances(
  participant: BattleParticipant,
): ParticipantResistances {
  const extras = getParticipantExtras(participant);

  return extras.resistances ?? {};
}

/** Зберігає резисти учасника в extras */
export function setParticipantResistances(
  participant: BattleParticipant,
  res: ParticipantResistances,
): void {
  const extras = getParticipantExtras(participant);

  extras.resistances = res;
  setParticipantExtras(participant, extras);
}
