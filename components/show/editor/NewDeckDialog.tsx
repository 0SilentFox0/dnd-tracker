"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { DECK_TITLE_MAX } from "@/lib/constants/show";

const FORM_ID = "new-deck-form";

export function NewDeckDialog({ open, onOpenChange, onCreate, pending }: { open: boolean; onOpenChange(open: boolean): void; onCreate(title: string): Promise<boolean>; pending: boolean }) {
  const t = useTranslations("show");

  const tc = useTranslations("common");

  const [title, setTitle] = useState("");

  const trimmed = title.trim();

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title={t("newDeck.title")}
      footer={
        <Button type="submit" form={FORM_ID} disabled={!trimmed || pending}>
          {tc("actions.create")}
        </Button>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={async (e) => {
          e.preventDefault();

          if (await onCreate(trimmed)) setTitle("");
        }}
      >
        <Input aria-label={t("newDeck.name")} placeholder={t("newDeck.name")} maxLength={DECK_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} />
      </form>
    </ResponsiveDialog>
  );
}
