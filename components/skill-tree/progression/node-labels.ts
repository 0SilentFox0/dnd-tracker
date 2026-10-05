import type { ProgressionNode } from "@/lib/utils/skills/progression";
import { BRANCH_LEVEL_LABEL, CIRCLE_LABEL } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export function nodeLabel(node: ProgressionNode, dto: CharacterProgressionDto): { title: string; tag: string; skillName: string | null } {
  const skillName = node.skillId ? (dto.skills[node.skillId]?.name ?? null) : null;

  switch (node.kind) {
    case "branchLevel": {
      const branch = dto.branches[node.branchId]?.name ?? node.branchId;

      return { title: node.level === "basic" ? `${branch} → Основи` : `${branch} → ${BRANCH_LEVEL_LABEL[node.level]}`, tag: "Підвищення гілки", skillName };
    }
    case "racial":
      return { title: skillName ?? `Расове · ${BRANCH_LEVEL_LABEL[node.level]}`, tag: `Расове · ${BRANCH_LEVEL_LABEL[node.level]}`, skillName };
    case "slot":
      return { title: skillName ?? "Невідомий скіл", tag: `Скіл · ${CIRCLE_LABEL[node.circle]}`, skillName };
    case "ultimate":
      return { title: skillName ?? "Ультимейт", tag: "Ультимейт", skillName };
  }
}

export function pointsText(free: number): string {
  const mod10 = free % 10;

  const mod100 = free % 100;

  const word = mod10 === 1 && mod100 !== 11 ? "вільне очко" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "вільні очки" : "вільних очок";

  return `${free} ${word}`;
}
