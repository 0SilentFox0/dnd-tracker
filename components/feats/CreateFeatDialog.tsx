"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { FeatFormData } from "@/types/choices";

const emptyFeat = (name: string): FeatFormData => ({ name, icon: null, type: "general", prerequisite: {}, repeatable: false, description: null, abilities: [], choices: [] });

export function CreateFeatDialog({ open, onOpenChange, onCreateFeat }: { open: boolean; onOpenChange: (open: boolean) => void; onCreateFeat: (data: FeatFormData) => void }) {
  const t = useTranslations("feats");

  const tc = useTranslations("common");

  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreateFeat(emptyFeat(name.trim()));
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
          <Button type="submit" form="create-feat-form" disabled={!name.trim()}>
            {t("create.submit")}
          </Button>
        </>
      }
    >
      <form id="create-feat-form" onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="new-feat-name">{t("create.name")}</Label>
        <Input id="new-feat-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("create.namePlaceholder")} />
      </form>
    </ResponsiveDialog>
  );
}
