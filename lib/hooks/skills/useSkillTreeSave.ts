import { useState } from "react";
import { useRouter } from "next/navigation";

import { updateSkillTree } from "@/lib/api/skill-trees";
import type { SkillTree } from "@/types/skill-tree";

interface UseSkillTreeSaveOptions {
  campaignId: string;
  onSuccess?: (updatedTree: SkillTree) => void;
  onError?: (error: Error) => void;
}

export function useSkillTreeSave({
  campaignId,
  onSuccess,
  onError,
}: UseSkillTreeSaveOptions) {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);

  const saveSkillTree = async (treeToSave: SkillTree) => {
    if (!treeToSave) {
      return;
    }

    setIsSaving(true);
    try {
      const updatedTree = await updateSkillTree({
        campaignId,
        treeId: treeToSave.id,
        skills: treeToSave,
      });

      // Конвертуємо відповідь сервера в SkillTree формат
      const skillsData = updatedTree.skills as SkillTree | { mainSkills?: SkillTree["mainSkills"] };
      
      let convertedTree: SkillTree;

      if ((skillsData as SkillTree).mainSkills) {
        // Вже правильний формат
        convertedTree = {
          ...(skillsData as SkillTree),
          id: updatedTree.id,
          campaignId: updatedTree.campaignId,
          race: updatedTree.race,
          createdAt: new Date(updatedTree.createdAt),
        };
      } else {
        // Prisma формат з mainSkills
        const data = skillsData as {
          mainSkills: SkillTree["mainSkills"];
          ultimateSkill?: SkillTree["ultimateSkill"];
        };

        convertedTree = {
          id: updatedTree.id,
          campaignId: updatedTree.campaignId,
          race: updatedTree.race,
          mainSkills: data.mainSkills,
          centralSkills: [],
          ultimateSkill:
            data.ultimateSkill ||
            ({
              id: `${updatedTree.race}_ultimate`,
              name: "Ультимативний навик",
              description:
                "Могутній навик, доступний після вивчення 3 навиків з кола 2",
            } as SkillTree["ultimateSkill"]),
          createdAt: new Date(updatedTree.createdAt),
        };
      }

      // Викликаємо onSuccess перед refresh, щоб оновити стан
      onSuccess?.(convertedTree);

      // Оновлюємо сторінку для синхронізації даних
      router.refresh();

      return convertedTree;
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");

      onError?.(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveSkillTree,
    isSaving,
  };
}
