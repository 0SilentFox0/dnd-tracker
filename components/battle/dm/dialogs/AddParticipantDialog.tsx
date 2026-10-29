"use client";

import { type FormEvent, useState } from "react";
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
import { useCharacters } from "@/lib/hooks/characters";
import { useUnitPicker } from "@/lib/hooks/units";
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

  const [type, setType] = useState<ParticipantSourceTypeValue>(ParticipantSourceType.CHARACTER);

  const [side, setSide] = useState<ParticipantSide>(ParticipantSide.ALLY);

  const [characterId, setCharacterId] = useState("");

  const [quantity, setQuantity] = useState<number>(QUANTITY.min);

  const [reserved, setReserved] = useState(false);

  const { data: characters = [] } = useCharacters(campaignId, { compact: true, enabled: open });

  const picker = useUnitPicker(campaignId, open);

  const { unitId } = picker;

  const placing = Boolean(onPlace) && type === ParticipantSourceType.UNIT && !reserved;

  const [submitted, setSubmitted] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);

  // the parent closes the dialog in onSuccess: only then reset the input
  if (open !== wasOpen) {
    setWasOpen(open);

    if (!open && submitted) {
      setSubmitted(false);
      setCharacterId("");
      picker.reset();
      setQuantity(QUANTITY.min);
      setReserved(false);
    }
  }

  // error: the dialog stays open, Cancel must not wipe the input
  if (isError && submitted) setSubmitted(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (type === ParticipantSourceType.CHARACTER && characterId) {
      setSubmitted(true);
      onAdd({ sourceId: characterId, type: ParticipantSourceType.CHARACTER, side, reserved });
    } else if (type === ParticipantSourceType.UNIT && unitId) {
      const data = { sourceId: unitId, type: ParticipantSourceType.UNIT, side, quantity: quantity || QUANTITY.min, reserved };

      setSubmitted(true);

      if (placing && onPlace) {
        onPlace(data);
        onOpenChange(false);
      } else onAdd(data);
    }
  };

  const canSubmit =
    type === ParticipantSourceType.CHARACTER ? Boolean(characterId) : Boolean(unitId);

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
            onValueChange={(v) => setSide(v as ParticipantSide)}
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
            onValueChange={(v) => setType(v as ParticipantSourceTypeValue)}
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
            <Select value={characterId} onValueChange={setCharacterId}>
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
                onChange={(e) => setQuantity(clampUnitQuantity(Number(e.target.value), QUANTITY))}
              />
            </div>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={reserved} onCheckedChange={(v) => setReserved(v === true)} />
          {t("reserve")}
        </label>
      </form>
    </ResponsiveDialog>
  );
}
