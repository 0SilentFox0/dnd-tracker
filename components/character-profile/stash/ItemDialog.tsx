"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { INGREDIENT_SLUG_RE } from "@/lib/constants/spell-ingredients";
import { useStashAction } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";
import { ingredientKey as ingredientSlug } from "@/lib/utils/spells/ingredients";
import type { SpecialItem } from "@/types/inventory";

interface ItemDialogProps {
  item: SpecialItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORM_ID = "stash-item-form";

export function ItemDialog({ item, open, onOpenChange }: ItemDialogProps) {
  const { campaignId, characterId } = useProfile();

  const t = useTranslations("inventory");

  const tc = useTranslations("common.actions");

  const action = useStashAction(campaignId, characterId);

  const notify = useNotify();

  const [name, setName] = useState(item?.name ?? "");

  const [description, setDescription] = useState(item?.description ?? "");

  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));

  const [consumable, setConsumable] = useState(item?.consumable ?? false);

  const [worthGp, setWorthGp] = useState(item?.worthGp === undefined ? "" : String(item.worthGp));

  const [ingredient, setIngredient] = useState(item?.ingredient ?? "");

  const qty = Math.floor(Number(quantity));

  const worth = worthGp.trim() === "" ? undefined : Number(worthGp);

  const ingredientKey = ingredient.trim() ? ingredientSlug(ingredient) : undefined;

  const invalid = !name.trim() || !(qty >= 1) || (worth !== undefined && !(worth >= 0)) || (ingredientKey !== undefined && !INGREDIENT_SLUG_RE.test(ingredientKey));

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    const fields = { name: name.trim(), description: description.trim() || undefined, quantity: qty, consumable, worthGp: worth, ingredient: ingredientKey };

    try {
      await action.mutateAsync(item ? { action: "editItem", itemId: item.id, ...fields } : { action: "addItem", ...fields });
      onOpenChange(false);
    } catch (err) {
      notify((err as Error).message || t("errors.itemSaveFailed"));
    }
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title={item ? t("itemDialog.editTitle") : t("itemDialog.addTitle")}
      footer={
        <Button type="submit" form={FORM_ID} disabled={action.isPending || invalid}>
          {tc("save")}
        </Button>
      }
    >
      <form id={FORM_ID} onSubmit={(e) => void submit(e)} className="space-y-3">
        <Input aria-label={t("itemDialog.name")} placeholder={t("itemDialog.name")} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="h-11" autoFocus />
        <Textarea aria-label={t("itemDialog.description")} placeholder={t("itemDialog.description")} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <Input type="number" min={1} step={1} inputMode="numeric" aria-label={t("itemDialog.quantity")} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11" />
        <Input type="number" min={0} step="any" inputMode="decimal" aria-label={t("itemDialog.worthGp")} placeholder={t("itemDialog.worthGp")} value={worthGp} onChange={(e) => setWorthGp(e.target.value)} className="h-11" />
        <Input aria-label={t("itemDialog.ingredient")} placeholder={t("itemDialog.ingredient")} maxLength={40} value={ingredient} onChange={(e) => setIngredient(e.target.value)} className="h-11" />
        <label className="flex min-h-11 items-center gap-2 text-sm text-hud-ink">
          <input type="checkbox" checked={consumable} onChange={(e) => setConsumable(e.target.checked)} className="size-4" />
          {t("itemDialog.consumable")}
        </label>
      </form>
    </ResponsiveDialog>
  );
}
