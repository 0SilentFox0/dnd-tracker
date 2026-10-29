import type { Translator } from "@/lib/i18n/translator";
import type { ProgressionNode } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export function nodeLabel(node: ProgressionNode, dto: CharacterProgressionDto, t: Translator): { title: string; tag: string; skillName: string | null } {
  const skillName = node.skillId ? (dto.skills[node.skillId]?.name ?? null) : null;

  switch (node.kind) {
    case "branchLevel": {
      const branch = dto.branches[node.branchId]?.name ?? node.branchId;

      return { title: t("node.branchTier", { branch, tier: t(`tiers.${node.level}`) }), tag: t("node.tagBranchUp"), skillName };
    }
    case "racial":
      return { title: skillName ?? t("node.tagRacial", { tier: t(`tiers.${node.level}`) }), tag: t("node.tagRacial", { tier: t(`tiers.${node.level}`) }), skillName };
    case "slot":
      return { title: skillName ?? t("row.unknownSkill"), tag: t("node.tagSkill", { circle: t(`circles.${node.circle}`) }), skillName };
    case "ultimate":
      return { title: skillName ?? t("cells.ultimate"), tag: t("cells.ultimate"), skillName };
  }
}
