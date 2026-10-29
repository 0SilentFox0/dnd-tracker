"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useDeleteMainSkill, useMainSkills } from "./useMainSkills";

import { useConfirm, useSearch } from "@/lib/hooks/common";
import type { MainSkill } from "@/types/main-skills";

const mainSkillFields = (mainSkill: MainSkill) => [mainSkill.name];

export function useMainSkillsList(campaignId: string, initialMainSkills: MainSkill[]) {
  const t = useTranslations();

  const confirm = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);

  const { data: allMainSkills = initialMainSkills } = useMainSkills(campaignId, { initialData: initialMainSkills });

  const search = useSearch(allMainSkills, mainSkillFields);

  const deleteMainSkill = useDeleteMainSkill(campaignId);

  const remove = async (mainSkillId: string) => {
    const ok = await confirm({
      title: t("skills.mainSkills.list.deleteConfirm"),
      confirmLabel: t("common.actions.delete"),
      destructive: true,
    });

    if (ok) await deleteMainSkill.mutateOk(mainSkillId);
  };

  return {
    mainSkills: search.items,
    total: allMainSkills.length,
    search,
    createDialog: { open: createOpen, setOpen: setCreateOpen },
    actions: { remove },
  };
}
