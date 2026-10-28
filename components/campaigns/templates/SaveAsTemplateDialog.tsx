"use client";

import { useState } from "react";
import Link from "next/link";

import { FormAlert } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSaveAsTemplate } from "@/lib/hooks/campaigns";
import { useNotify } from "@/lib/hooks/common";

interface SaveAsTemplateDialogProps {
  campaignId: string;
  defaultName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORM_ID = "save-as-template-form";

export function SaveAsTemplateDialog({ campaignId, defaultName, open, onOpenChange }: SaveAsTemplateDialogProps) {
  const save = useSaveAsTemplate(campaignId);

  const notify = useNotify();

  const [name, setName] = useState(defaultName);

  const [description, setDescription] = useState("");

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    save.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (template) => {
          onOpenChange(false);
          void notify(
            <span>
              Шаблон створено.{" "}
              <Link href={`/campaigns/${template.id}`} className="underline">
                Відкрити
              </Link>
            </span>,
          );
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Помилка збереження шаблону"),
      },
    );
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Зберегти як шаблон"
      description="Бібліотека кампанії (без героїв і боїв) стане шаблоном для нових кампаній"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Скасувати
          </Button>
          <Button type="submit" form={FORM_ID} disabled={save.isPending || !name.trim()}>
            {save.isPending ? "Збереження..." : "Створити шаблон"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <LabeledInput id="template-name" label="Назва" value={name} onChange={(e) => setName(e.target.value)} disabled={save.isPending} required />
        <div className="space-y-2">
          <Label htmlFor="template-description">Опис</Label>
          <Textarea id="template-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={save.isPending} rows={3} />
        </div>
        {error && (
          <FormAlert>{error}</FormAlert>
        )}
      </form>
    </ResponsiveDialog>
  );
}
