"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParticipantSide, ParticipantSourceType, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import { clampUnitQuantity, UNIT_QUANTITY as QUANTITY } from "@/lib/constants/battle-units";
import { useAddParticipantForm } from "@/lib/hooks/battle";
import type { AddParticipantData } from "@/types/battle";

const FORM_ID = "add-participant-form";

interface AddParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onAdd: (data: AddParticipantData) => void;
  isPending?: boolean;
  isError?: boolean;
  /** maze: the unit is not added right away but waits for a cell click */
  onPlace?: (data: AddParticipantData) => void;
}

export function AddParticipantDialog({
  open,
  onOpenChange,
  campaignId,
  onAdd,
  isPending,
  isError,
  onPlace,
}: AddParticipantDialogProps) {
  const t = useTranslations("battleDm.addParticipant");

  const tActions = useTranslations("common.actions");

  const { form: { type, side, characterId, quantity, reserved }, set, characters, picker, submit: { placing, canSubmit, handleSubmit } } = useAddParticipantForm({ campaignId, open, onOpenChange, onAdd, onPlace, isError });

  const { unitId } = picker;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      hud
      title={t("title")}
      description={t("description")}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tActions("cancel")}</Button>
          <Button type="submit" form={FORM_ID} disabled={!canSubmit || isPending}>{isPending ? t("adding") : placing ? t("pickCell") : tActions("add")}</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>{t("side")}</Label>
          <Select
            value={side}
            onValueChange={(v) => set.side(v as ParticipantSide)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ParticipantSide.ALLY}>{t("ally")}</SelectItem>
              <SelectItem value={ParticipantSide.ENEMY}>{t("enemy")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("type")}</Label>
          <Select
            value={type}
            onValueChange={(v) => set.type(v as ParticipantSourceTypeValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ParticipantSourceType.CHARACTER}>{t("hero")}</SelectItem>
              <SelectItem value={ParticipantSourceType.UNIT}>{t("unit")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === ParticipantSourceType.CHARACTER && (
          <div className="space-y-2">
            <Label>{t("hero")}</Label>
            <Select value={characterId} onValueChange={set.characterId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("pickHero")} />
              </SelectTrigger>
              <SelectContent>
                {characters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {type === ParticipantSourceType.UNIT && (
          <>
            <div className="space-y-2">
              <Label>{t("race")}</Label>
              <Select value={picker.raceKey} onValueChange={picker.selectRace}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("pickRace")} />
                </SelectTrigger>
                <SelectContent>
                  {picker.raceOptions.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label} ({r.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("unit")}</Label>
              <Select value={unitId} onValueChange={picker.setUnitId} disabled={!picker.raceKey}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={picker.raceKey ? t("pickUnit") : t("pickRaceFirst")} />
                </SelectTrigger>
                <SelectContent>
                  {picker.tiers.map((tier) => (
                    <SelectGroup key={tier.level}>
                      <SelectLabel>{t("level", { level: tier.level })}</SelectLabel>
                      {tier.units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("quantity")}</Label>
              <Input
                type="number"
                min={QUANTITY.min}
                max={QUANTITY.max}
                value={quantity}
                onChange={(e) => set.quantity(clampUnitQuantity(Number(e.target.value), QUANTITY))}
              />
            </div>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={reserved} onCheckedChange={(v) => set.reserved(v === true)} />
          {t("reserve")}
        </label>
      </form>
    </ResponsiveDialog>
  );
}
