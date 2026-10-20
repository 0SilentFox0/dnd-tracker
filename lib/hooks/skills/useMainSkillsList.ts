"use client";

import { useState } from "react";

import { useDeleteMainSkill, useMainSkills } from "./useMainSkills";

import { useConfirm } from "@/lib/hooks/common";
import type { MainSkill } from "@/types/main-skills";

export function useMainSkillsList(campaignId: string, initialMainSkills: MainSkill[]) {
  const confirm = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);

  const { data: mainSkills = initialMainSkills } = useMainSkills(campaignId, { initialData: initialMainSkills });

  const deleteMainSkill = useDeleteMainSkill(campaignId);

  const remove = async (mainSkillId: string) => {
    const ok = await confirm({
      title: "Ви впевнені, що хочете видалити цей основний навик? Це також видалить всі скіли, пов'язані з ним.",
      confirmLabel: "Видалити",
      destructive: true,
    });

    if (ok) await deleteMainSkill.mutateOk(mainSkillId);
  };

  return {
    mainSkills,
    createDialog: { open: createOpen, setOpen: setCreateOpen },
    actions: { remove },
  };
}
