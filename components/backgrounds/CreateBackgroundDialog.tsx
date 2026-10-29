"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { BackgroundFormData } from "@/types/backgrounds";

const emptyBackground = (name: string): BackgroundFormData => ({ name, icon: null, description: null, choices: [], skillProficiencies: [], toolProficiencies: [], originFeatId: null, equipmentText: null });

export function CreateBackgroundDialog({ open, onOpenChange, onCreateBackground }: { open: boolean; onOpenChange: (open: boolean) => void; onCreateBackground: (data: BackgroundFormData) => void }) {
  const t = useTranslations("backgrounds");

  const tc = useTranslations("common");

  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreateBackground(emptyBackground(name.trim()));
    setName("");
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("create.title")}
      description={t("create.description")}
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("actions.cancel")}
          </Button>
          <Button type="submit" form="create-background-form" disabled={!name.trim()}>
            {t("create.submit")}
          </Button>
        </>
      }
    >
      <form id="create-background-form" onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="new-background-name">{t("create.name")}</Label>
        <Input id="new-background-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("create.namePlaceholder")} />
      </form>
    </ResponsiveDialog>
  );
}
