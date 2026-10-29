"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface NameOnlyCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  texts: { title: string; description: string; name: string; namePlaceholder: string; submit: string };
  onSubmit: (name: string) => void;
}

export function NameOnlyCreateDialog({ open, onOpenChange, formId, texts, onSubmit }: NameOnlyCreateDialogProps) {
  const t = useTranslations("common.actions");

  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit(name.trim());
    setName("");
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={texts.title}
      description={texts.description}
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" form={formId} disabled={!name.trim()}>
            {texts.submit}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor={`${formId}-name`}>{texts.name}</Label>
        <Input id={`${formId}-name`} value={name} onChange={(e) => setName(e.target.value)} required placeholder={texts.namePlaceholder} />
      </form>
    </ResponsiveDialog>
  );
}
