"use client";

import { useTranslations } from "next-intl";

import { NameOnlyCreateDialog } from "@/components/common/NameOnlyCreateDialog";
import type { BackgroundFormData } from "@/types/backgrounds";

const emptyBackground = (name: string): BackgroundFormData => ({ name, icon: null, description: null, choices: [], skillProficiencies: [], toolProficiencies: [], originFeatId: null, equipmentText: null });

export function CreateBackgroundDialog({ open, onOpenChange, onCreateBackground }: { open: boolean; onOpenChange: (open: boolean) => void; onCreateBackground: (data: BackgroundFormData) => void }) {
  const t = useTranslations("backgrounds.create");

  const texts = { title: t("title"), description: t("description"), name: t("name"), namePlaceholder: t("namePlaceholder"), submit: t("submit") };

  return <NameOnlyCreateDialog open={open} onOpenChange={onOpenChange} formId="create-background-form" texts={texts} onSubmit={(name) => onCreateBackground(emptyBackground(name))} />;
}
