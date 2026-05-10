import { NextResponse } from "next/server";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { getHeroDamageComponents } from "@/lib/constants/hero-scaling";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { distributePendingScopedArtifactBonuses } from "@/lib/utils/battle/artifact-sets";
import { getDiceAverage } from "@/lib/utils/battle/balance";
import { logBattleTiming } from "@/lib/utils/battle/battle-timing";
import { calculateDamageWithModifiers } from "@/lib/utils/battle/damage";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant";
import { calculateSpellDamageWithEnhancements } from "@/lib/utils/battle/spell/calculations";
import { formatSpellDamageDiceRoll } from "@/lib/utils/spells/spell-calculations";

/**
 * Розподіл шкоди по AoE-цілях. `total` — повна шкода для одного target
 * (як зараз), `targets` — масив damages для кожної послідовної цілі
 * (за damageDistribution). `targetsTotal` — сума по targets.
 *
 * Якщо distribution null/відсутнє — `targets` має 1 елемент = total
 * (backward-compat: показуємо single-target preview).
 */
export interface DamagePreviewItem {
  total: number;
  breakdown: string[];
  diceFormula: string | null;
  hasWeapon: boolean;
  spellEffectKind?: "damage" | "heal" | "all";
  /** Damage per AoE target (default [total] якщо distribution не заданий). */
  targets?: number[];
  /** Сума по targets (якщо distribution > 1 елемент). */
  targetsTotal?: number;
  /** Distribution % per target (для UI відображення). */
  distribution?: number[] | null;
}

export interface DamagePreviewResponse {
  melee: DamagePreviewItem;
  ranged: DamagePreviewItem;
  magic?: DamagePreviewItem | null;
}

/**
 * Обчислює damages per target за distribution + total + targetsTotal.
 * Поведінка:
 *  - distribution null/empty → targets=[fullDamage], total=fullDamage
 *  - distribution=[100, 75] → targets=[full, floor(full × 0.75)]
 */
function buildTargetDamages(
  fullDamage: number,
  distribution: number[] | null | undefined,
): { targets: number[]; targetsTotal: number; effectiveDist: number[] | null } {
  if (!distribution || distribution.length === 0) {
    return {
      targets: [fullDamage],
      targetsTotal: fullDamage,
      effectiveDist: null,
    };
  }

  const targets = distribution.map((pct) =>
    Math.floor((fullDamage * pct) / 100),
  );

  const targetsTotal = targets.reduce((a, b) => a + b, 0);

  return { targets, targetsTotal, effectiveDist: distribution };
}

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; characterId: string }> }
) {
  const t0 = Date.now();

  try {
    const { id: campaignId, characterId } = await params;

    const { searchParams } = new URL(request.url);

    const meleeMultiplier = Math.max(0.1, Math.min(3, parseFloat(searchParams.get("meleeMultiplier") ?? "1") || 1));

    const rangedMultiplier = Math.max(0.1, Math.min(3, parseFloat(searchParams.get("rangedMultiplier") ?? "1") || 1));

    const meleeDiceSumParam = searchParams.get("meleeDiceSum");

    const rangedDiceSumParam = searchParams.get("rangedDiceSum");

    const meleeDiceSum = meleeDiceSumParam != null ? parseInt(meleeDiceSumParam, 10) : null;

    const rangedDiceSum = rangedDiceSumParam != null ? parseInt(rangedDiceSumParam, 10) : null;

    const spellIdParam = searchParams.get("spellId");

    const spellDiceSumParam = searchParams.get("spellDiceSum");

    const accessResult = await requireCampaignAccess(campaignId, false);

    if (accessResult instanceof NextResponse) return accessResult;

    const character = await prisma.character.findUnique({
      where: { id: characterId, campaignId },
      include: {
        inventory: true,
        characterSkills: {
          include: { skillTree: true },
        },
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    const participant = await createBattleParticipantFromCharacter(
      character,
      "",
      ParticipantSide.ALLY
    );

    distributePendingScopedArtifactBonuses([participant]);

    const meleeAttack = participant.battleData.attacks?.find(
      (a) => a.type === AttackType.MELEE
    );

    const rangedAttack = participant.battleData.attacks?.find(
      (a) => a.type === AttackType.RANGED
    );

    const strMod = Math.floor((participant.abilities.strength - 10) / 2);

    const dexMod = Math.floor((participant.abilities.dexterity - 10) / 2);

    const meleeHero = getHeroDamageComponents(
      participant.abilities.level,
      AttackType.MELEE
    );

    const rangedHero = getHeroDamageComponents(
      participant.abilities.level,
      AttackType.RANGED
    );

    const useMeleeUserSum = meleeDiceSum != null && !Number.isNaN(meleeDiceSum);

    const useRangedUserSum = rangedDiceSum != null && !Number.isNaN(rangedDiceSum);

    const meleeBase = useMeleeUserSum
      ? (meleeDiceSum ?? 0)
      : (meleeAttack ? getDiceAverage(meleeAttack.damageDice) : 0);

    const meleeDiceAvg = useMeleeUserSum
      ? 0
      : getDiceAverage(meleeHero.diceNotation);

    const rangedBase = useRangedUserSum
      ? (rangedDiceSum ?? 0)
      : (rangedAttack ? getDiceAverage(rangedAttack.damageDice) : 0);

    const rangedDiceAvg = useRangedUserSum
      ? 0
      : getDiceAverage(rangedHero.diceNotation);

    const meleeResult = calculateDamageWithModifiers(
      participant,
      meleeBase,
      strMod,
      AttackType.MELEE,
      {
        heroLevelPart: meleeHero.levelPart,
        heroDicePart: meleeDiceAvg,
        heroDiceNotation: useMeleeUserSum ? undefined : meleeHero.diceNotation,
        weaponDiceNotation: useMeleeUserSum
          ? "кидки"
          : (meleeAttack?.damageDice ?? undefined),
      }
    );

    const rangedResult = calculateDamageWithModifiers(
      participant,
      rangedBase,
      dexMod,
      AttackType.RANGED,
      {
        heroLevelPart: rangedHero.levelPart,
        heroDicePart: rangedDiceAvg,
        heroDiceNotation: useRangedUserSum ? undefined : rangedHero.diceNotation,
        weaponDiceNotation: useRangedUserSum
          ? "кидки"
          : (rangedAttack?.damageDice ?? undefined),
      }
    );

    logBattleTiming("damage-preview: total (перерахунок шкоди)", t0, {
      characterId,
    });

    let magic: DamagePreviewItem | null = null;

    if (
      spellIdParam &&
      spellDiceSumParam != null &&
      spellDiceSumParam !== ""
    ) {
      const spellDiceSum = parseInt(spellDiceSumParam, 10);

      if (!Number.isNaN(spellDiceSum)) {
        const dbSpell = await prisma.spell.findFirst({
          where: { id: spellIdParam, campaignId },
        });

        const dt = String(dbSpell?.damageType ?? "")
          .trim()
          .toLowerCase();

        if (
          dbSpell &&
          (dt === "damage" || dt === "heal" || dt === "all")
        ) {
          const spellCalc = calculateSpellDamageWithEnhancements(
            participant,
            spellDiceSum,
            undefined,
            { addHeroLevelToBase: true },
            { groupId: dbSpell.groupId ?? null },
          );

          const floorTotal = Math.floor(spellCalc.totalDamage);

          const fullBreakdown = spellCalc.breakdown;

          const breakdown =
            fullBreakdown.length >= 2
              ? fullBreakdown.slice(0, -2)
              : fullBreakdown;

          const diceNotation = formatSpellDamageDiceRoll(
            dbSpell.diceCount,
            dbSpell.diceType,
          );

          const magicDist = Array.isArray(dbSpell.damageDistribution)
            ? (dbSpell.damageDistribution as number[]).filter(
                (n) => typeof n === "number",
              )
            : null;

          const magicTargets = buildTargetDamages(floorTotal, magicDist);

          magic = {
            total: floorTotal,
            breakdown,
            diceFormula: diceNotation,
            hasWeapon: false,
            spellEffectKind:
              dt === "heal"
                ? "heal"
                : dt === "all"
                  ? "all"
                  : "damage",
            targets: magicTargets.targets,
            targetsTotal: magicTargets.targetsTotal,
            distribution: magicTargets.effectiveDist,
          };
        }
      }
    }

    const meleeFullDamage = Math.floor(meleeResult.totalDamage * meleeMultiplier);

    const meleeDist = meleeAttack?.damageDistribution ?? null;

    const meleeTargets = buildTargetDamages(meleeFullDamage, meleeDist);

    const rangedFullDamage = Math.floor(rangedResult.totalDamage * rangedMultiplier);

    const rangedDist = rangedAttack?.damageDistribution ?? null;

    const rangedTargets = buildTargetDamages(rangedFullDamage, rangedDist);

    const response: DamagePreviewResponse = {
      melee: {
        total: meleeFullDamage,
        breakdown: [
          ...meleeResult.breakdown,
          ...(meleeMultiplier !== 1 ? [`× ${meleeMultiplier} (коеф. DM) = ${meleeFullDamage}`] : []),
        ],
        diceFormula: meleeAttack?.damageDice ?? null,
        hasWeapon: !!meleeAttack,
        targets: meleeTargets.targets,
        targetsTotal: meleeTargets.targetsTotal,
        distribution: meleeTargets.effectiveDist,
      },
      ranged: {
        total: rangedFullDamage,
        breakdown: [
          ...rangedResult.breakdown,
          ...(rangedMultiplier !== 1 ? [`× ${rangedMultiplier} (коеф. DM) = ${rangedFullDamage}`] : []),
        ],
        diceFormula: rangedAttack?.damageDice ?? null,
        hasWeapon: !!rangedAttack,
        targets: rangedTargets.targets,
        targetsTotal: rangedTargets.targetsTotal,
        distribution: rangedTargets.effectiveDist,
      },
      magic,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { action: "compute damage preview" });
  }
}
