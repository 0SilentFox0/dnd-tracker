"use client";

import { useTranslations } from "next-intl";

import { NameOnlyCreateDialog } from "@/components/common/NameOnlyCreateDialog";
import type { FeatFormData } from "@/types/choices";

const emptyFeat = (name: string): FeatFormData => ({ name, icon: null, type: "general", prerequisite: {}, repeatable: false, description: null, abilities: [], choices: [] });

export function CreateFeatDialog({ open, onOpenChange, onCreateFeat }: { open: boolean; onOpenChange: (open: boolean) => void; onCreateFeat: (data: FeatFormData) => void }) {
  const t = useTranslations("feats.create");

  const texts = { title: t("title"), description: t("description"), name: t("name"), namePlaceholder: t("namePlaceholder"), submit: t("submit") };

  return <NameOnlyCreateDialog open={open} onOpenChange={onOpenChange} formId="create-feat-form" texts={texts} onSubmit={(name) => onCreateFeat(emptyFeat(name))} />;
}
