import { NextResponse } from "next/server";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { getHeroDamageComponents } from "@/lib/constants/hero-scaling";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { distributePendingScopedArtifactBonuses } from "@/lib/utils/battle/artifact-sets";
import { getDiceAverage } from "@/lib/utils/battle/balance";
import { logBattleTiming } from "@/lib/utils/battle/battle-timing";
import { calculateDamageWithModifiers } from "@/lib/utils/battle/damage";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant";
import { calculateSpellDamageWithEnhancements } from "@/lib/utils/battle/spell/calculations";
import { formatSpellDamageDiceRoll } from "@/lib/utils/spells/spell-calculations";

export interface DamagePreviewItem {
  total: number;
  breakdown: string[];
  diceFormula: string | null;
  hasWeapon: boolean;
  spellEffectKind?: "damage" | "heal" | "all";
}

export interface DamagePreviewResponse {
  melee: DamagePreviewItem;
  ranged: DamagePreviewItem;
  magic?: DamagePreviewItem | null;
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
          };
        }
      }
    }

    const response: DamagePreviewResponse = {
      melee: {
        total: Math.floor(meleeResult.totalDamage * meleeMultiplier),
        breakdown: [
          ...meleeResult.breakdown,
          ...(meleeMultiplier !== 1 ? [`× ${meleeMultiplier} (коеф. DM) = ${Math.floor(meleeResult.totalDamage * meleeMultiplier)}`] : []),
        ],
        diceFormula: meleeAttack?.damageDice ?? null,
        hasWeapon: !!meleeAttack,
      },
      ranged: {
        total: Math.floor(rangedResult.totalDamage * rangedMultiplier),
        breakdown: [
          ...rangedResult.breakdown,
          ...(rangedMultiplier !== 1 ? [`× ${rangedMultiplier} (коеф. DM) = ${Math.floor(rangedResult.totalDamage * rangedMultiplier)}`] : []),
        ],
        diceFormula: rangedAttack?.damageDice ?? null,
        hasWeapon: !!rangedAttack,
      },
      magic,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error computing damage preview:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
