"use client";

import { type FormEvent, useState } from "react";

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
import { clampUnitQuantity, UNIT_QUANTITY } from "@/lib/constants/battle-units";
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
  /** лабіринт: юніт не додається одразу, а чекає на клік по клітинці */
  onPlace?: (data: AddParticipantData) => void;
}

export function AddParticipantDialog({
  open,
  onOpenChange,
  campaignId,
  onAdd,
  isPending,
  onPlace,
}: AddParticipantDialogProps) {
  const [type, setType] = useState<ParticipantSourceTypeValue>(ParticipantSourceType.CHARACTER);

  const [side, setSide] = useState<ParticipantSide>(ParticipantSide.ALLY);

  const [characterId, setCharacterId] = useState("");

  const [quantity, setQuantity] = useState<number>(UNIT_QUANTITY.min);

  const [reserved, setReserved] = useState(false);

  const { data: characters = [] } = useCharacters(campaignId, { compact: true, enabled: open });

  const picker = useUnitPicker(campaignId, open);

  const { unitId } = picker;

  const placing = Boolean(onPlace) && type === ParticipantSourceType.UNIT && !reserved;

  const [submitted, setSubmitted] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);

  // батько закриває діалог в onSuccess — лише тоді скидаємо введене
  if (open !== wasOpen) {
    setWasOpen(open);

    if (!open && submitted) {
      setSubmitted(false);
      setCharacterId("");
      picker.reset();
      setQuantity(UNIT_QUANTITY.min);
      setReserved(false);
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (type === ParticipantSourceType.CHARACTER && characterId) {
      setSubmitted(true);
      onAdd({ sourceId: characterId, type: ParticipantSourceType.CHARACTER, side, reserved });
    } else if (type === ParticipantSourceType.UNIT && unitId) {
      const data = { sourceId: unitId, type: ParticipantSourceType.UNIT, side, quantity: quantity || UNIT_QUANTITY.min, reserved };

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
      title="Додати учасника на поле"
      description="Учасник займе місце в черзі за своєю ініціативою або чекатиме в резерві."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button type="submit" form={FORM_ID} disabled={!canSubmit || isPending}>{isPending ? "Додаємо…" : placing ? "Вибрати клітинку" : "Додати"}</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Сторона</Label>
          <Select
            value={side}
            onValueChange={(v) => setSide(v as ParticipantSide)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ParticipantSide.ALLY}>Союзник</SelectItem>
              <SelectItem value={ParticipantSide.ENEMY}>Ворог</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Тип</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as ParticipantSourceTypeValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ParticipantSourceType.CHARACTER}>Герой</SelectItem>
              <SelectItem value={ParticipantSourceType.UNIT}>Юніт</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === ParticipantSourceType.CHARACTER && (
          <div className="space-y-2">
            <Label>Герой</Label>
            <Select value={characterId} onValueChange={setCharacterId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Оберіть героя" />
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
              <Label>Раса</Label>
              <Select value={picker.raceKey} onValueChange={picker.selectRace}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Оберіть расу" />
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
              <Label>Юніт</Label>
              <Select value={unitId} onValueChange={picker.setUnitId} disabled={!picker.raceKey}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={picker.raceKey ? "Оберіть юніта" : "Спершу оберіть расу"} />
                </SelectTrigger>
                <SelectContent>
                  {picker.tiers.map((tier) => (
                    <SelectGroup key={tier.level}>
                      <SelectLabel>Рівень {tier.level}</SelectLabel>
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
              <Label>Кількість</Label>
              <Input
                type="number"
                min={UNIT_QUANTITY.min}
                max={UNIT_QUANTITY.max}
                value={quantity}
                onChange={(e) => setQuantity(clampUnitQuantity(Number(e.target.value)))}
              />
            </div>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={reserved} onCheckedChange={(v) => setReserved(v === true)} />
          У резерв — з&apos;явиться, коли ДМ введе в бій
        </label>
      </form>
    </ResponsiveDialog>
  );
}
