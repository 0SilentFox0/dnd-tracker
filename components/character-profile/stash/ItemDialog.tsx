"use client";

import { type FormEvent, useState } from "react";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useStashAction } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";
import type { SpecialItem } from "@/types/inventory";

interface ItemDialogProps {
  item: SpecialItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORM_ID = "stash-item-form";

export function ItemDialog({ item, open, onOpenChange }: ItemDialogProps) {
  const { campaignId, characterId } = useProfile();

  const action = useStashAction(campaignId, characterId);

  const notify = useNotify();

  const [name, setName] = useState(item?.name ?? "");

  const [description, setDescription] = useState(item?.description ?? "");

  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));

  const [consumable, setConsumable] = useState(item?.consumable ?? false);

  const qty = Math.floor(Number(quantity));

  const invalid = !name.trim() || !(qty >= 1);

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    const fields = { name: name.trim(), description: description.trim() || undefined, quantity: qty, consumable };

    try {
      await action.mutateAsync(item ? { action: "editItem", itemId: item.id, ...fields } : { action: "addItem", ...fields });
      onOpenChange(false);
    } catch (err) {
      notify((err as Error).message || "Не вдалося зберегти річ");
    }
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Редагувати річ" : "Додати річ"}
      footer={
        <Button type="submit" form={FORM_ID} disabled={action.isPending || invalid}>
          Зберегти
        </Button>
      }
    >
      <form id={FORM_ID} onSubmit={(e) => void submit(e)} className="space-y-3">
        <Input aria-label="Назва" placeholder="Назва" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="h-11" autoFocus />
        <Textarea aria-label="Опис" placeholder="Опис" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <Input type="number" min={1} step={1} inputMode="numeric" aria-label="Кількість" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11" />
        <label className="flex min-h-11 items-center gap-2 text-sm text-hud-ink">
          <input type="checkbox" checked={consumable} onChange={(e) => setConsumable(e.target.checked)} className="size-4" />
          Одноразова
        </label>
      </form>
    </ResponsiveDialog>
  );
}
