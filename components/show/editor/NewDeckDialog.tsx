"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { DECK_TITLE_MAX } from "@/lib/constants/show";

const FORM_ID = "new-deck-form";

export function NewDeckDialog({ open, onOpenChange, onCreate, pending }: { open: boolean; onOpenChange(open: boolean): void; onCreate(title: string): Promise<boolean>; pending: boolean }) {
  const [title, setTitle] = useState("");

  const trimmed = title.trim();

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Новий набір"
      footer={
        <Button type="submit" form={FORM_ID} disabled={!trimmed || pending}>
          Створити
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
        <Input aria-label="Назва" placeholder="Назва" maxLength={DECK_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} />
      </form>
    </ResponsiveDialog>
  );
}
