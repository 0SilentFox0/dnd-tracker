"use client";

import { useMainSkills } from "./useMainSkills";
import { useSkills } from "./useSkills";
import { useSaveSkillTree, useSkillTrees } from "./useSkillTrees";

import { useConfirm, useNotify } from "@/lib/hooks/common";
import { useRaces } from "@/lib/hooks/races";
import { useSpellGroups } from "@/lib/hooks/spells";
import { downloadText } from "@/lib/utils/common/download-text";
import type { RawTree } from "@/lib/utils/skills/progression";
import { exportSkillTrees, isTreeImportFailure, planSkillTreeImport, readSkillTreeFiles, type SkillTreeFile, type TreeImportFailure, type TreeImportPlan } from "@/lib/utils/skills/tree-transfer";

export function useSkillTreeTransfer(campaignId: string) {
  const trees = useSkillTrees(campaignId);

  const mainSkills = useMainSkills(campaignId);

  const skills = useSkills(campaignId);

  const races = useRaces(campaignId);

  const save = useSaveSkillTree(campaignId);

  const spellGroups = useSpellGroups(campaignId);

  const notify = useNotify();

  const confirm = useConfirm();

  const data = trees.data && mainSkills.data && skills.data && races.data && spellGroups.data
    ? { trees: trees.data, mainSkills: mainSkills.data, skills: skills.data, races: races.data, spellGroups: spellGroups.data }
    : null;

  function exportAll() {
    if (!data) return;

    downloadText("skill-trees.json", JSON.stringify(exportSkillTrees(data.trees, data), null, 2), "application/json");
  }

  async function importFile(file: File) {
    if (!data) return;

    let files: SkillTreeFile[];

    try {
      files = readSkillTreeFiles(await file.text());
    } catch (e) {
      await notify(e instanceof Error ? e.message : "Не вдалося прочитати файл");

      return;
    }

    const saved: string[] = [];

    const failed: string[] = [];

    const plans: Array<TreeImportPlan | TreeImportFailure> = files.map((tree) => planSkillTreeImport(tree, data));

    const overwritten = plans.filter((p): p is TreeImportPlan => !isTreeImportFailure(p) && p.treeId !== "new").map((p) => p.race);

    if (overwritten.length > 0) {
      const ok = await confirm({
        title: "Замінити наявні дерева?",
        description: `Дерева рас буде перезаписано: ${overwritten.join(", ")}. Це не можна скасувати.`,
        confirmLabel: "Замінити",
        destructive: true,
      });

      if (!ok) return;
    }

    for (const plan of plans) {
      if (isTreeImportFailure(plan)) {
        failed.push(`${plan.race}: ${plan.error}`);
        continue;
      }

      failed.push(...(plan.warnings ?? []).map((w) => `${plan.race}: ${w}`));

      try {
        await save.mutateAsync({ treeId: plan.treeId, race: plan.race, skills: plan.skills as unknown as RawTree });
        saved.push(plan.race);
      } catch (e) {
        failed.push(`${plan.race}: ${e instanceof Error ? e.message : "помилка збереження"}`);
      }
    }

    await notify([saved.length > 0 ? `Збережено дерева: ${saved.join(", ")}` : "Жодного дерева не збережено", ...failed].join("; "));
  }

  return { ready: !!data, busy: save.isPending, actions: { exportAll, importFile } };
}
