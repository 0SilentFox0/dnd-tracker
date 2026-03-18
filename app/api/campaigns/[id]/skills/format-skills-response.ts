/**
 * Форматує список скілів з Prisma у згруповану структуру для фронтенду.
 */

export function formatSkillsListResponse(
  skills: Array<{
    id: string;
    campaignId: string;
    name: string;
    description: string | null;
    icon: string | null;
    bonuses: unknown;
    damage: number | null;
    armor: number | null;
    speed: number | null;
    physicalResistance: number | null;
    magicalResistance: number | null;
    spellId: string | null;
    spellGroupId: string | null;
    mainSkillId: string | null;
    spellEnhancementTypes: unknown;
    spellEffectIncrease: number | null;
    spellTargetChange: unknown;
    spellAdditionalModifier: unknown;
    spellNewSpellId: string | null;
    grantedSpellId?: string | null;
    basicInfo: unknown;
    combatStats: unknown;
    mainSkillData: unknown;
    spellData: unknown;
    spellEnhancementData: unknown;
    skillTriggers: unknown;
    image: string | null;
    appearanceDescription?: string | null;
    createdAt: Date;
    spell?: { id: string; name: string } | null;
    spellGroup?: { id: string; name: string } | null;
    grantedSpell?: { id: string; name: string } | null;
  }>,
) {
  return skills.map((skill) => {
    let basicInfo: Record<string, unknown>;

    if (
      skill.basicInfo &&
      typeof skill.basicInfo === "object" &&
      !Array.isArray(skill.basicInfo)
    ) {
      basicInfo = { ...(skill.basicInfo as Record<string, unknown>) };

      if (basicInfo.name === undefined || basicInfo.name === "")
        basicInfo.name = skill.name || "";

      if (basicInfo.description === undefined)
        basicInfo.description = skill.description ?? "";

      if (basicInfo.icon === undefined) basicInfo.icon = skill.icon ?? "";
    } else {
      basicInfo = {
        name: skill.name || "",
        description: skill.description || "",
        icon: skill.icon || "",
      };
    }

    const combatStats =
      skill.combatStats &&
      typeof skill.combatStats === "object" &&
      !Array.isArray(skill.combatStats)
        ? (skill.combatStats as Record<string, unknown>)
        : {
            damage: skill.damage || undefined,
            armor: skill.armor || undefined,
            speed: skill.speed || undefined,
            physicalResistance: skill.physicalResistance || undefined,
            magicalResistance: skill.magicalResistance || undefined,
          };

    const baseSpellData =
      skill.spellData &&
      typeof skill.spellData === "object" &&
      !Array.isArray(skill.spellData)
        ? (skill.spellData as Record<string, unknown>)
        : {};

    const spellData = {
      spellId: skill.spellId || (baseSpellData.spellId as string) || undefined,
      spellGroupId:
        skill.spellGroupId ||
        (baseSpellData.spellGroupId as string) ||
        undefined,
      grantedSpellId:
        skill.grantedSpellId ||
        (baseSpellData.grantedSpellId as string) ||
        undefined,
    };

    const spellEnhancementData =
      skill.spellEnhancementData &&
      typeof skill.spellEnhancementData === "object" &&
      !Array.isArray(skill.spellEnhancementData)
        ? (skill.spellEnhancementData as Record<string, unknown>)
        : {
            spellEnhancementTypes: Array.isArray(skill.spellEnhancementTypes)
              ? skill.spellEnhancementTypes
              : [],
            spellEffectIncrease: skill.spellEffectIncrease || undefined,
            spellTargetChange: skill.spellTargetChange || undefined,
            spellAdditionalModifier: skill.spellAdditionalModifier || undefined,
            spellNewSpellId: skill.spellNewSpellId || undefined,
          };

    const mainSkillData =
      skill.mainSkillData &&
      typeof skill.mainSkillData === "object" &&
      !Array.isArray(skill.mainSkillData)
        ? (skill.mainSkillData as Record<string, unknown>)
        : { mainSkillId: skill.mainSkillId || undefined };

    return {
      id: skill.id,
      campaignId: skill.campaignId,
      basicInfo,
      image: skill.image ?? null,
      appearanceDescription: skill.appearanceDescription ?? null,
      bonuses: (skill.bonuses as Record<string, number>) || {},
      combatStats,
      spellData,
      spellEnhancementData,
      mainSkillData,
      skillTriggers: Array.isArray(skill.skillTriggers)
        ? skill.skillTriggers
        : [],
      createdAt: skill.createdAt,
      spell: skill.spell
        ? { id: skill.spell.id, name: skill.spell.name }
        : null,
      spellGroup: skill.spellGroup
        ? { id: skill.spellGroup.id, name: skill.spellGroup.name }
        : null,
      grantedSpell: skill.grantedSpell
        ? { id: skill.grantedSpell.id, name: skill.grantedSpell.name }
        : null,
    };
  });
}
