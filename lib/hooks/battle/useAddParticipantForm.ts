"use client";

import { type FormEvent, useState } from "react";

import { ParticipantSide, ParticipantSourceType, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import { UNIT_QUANTITY as QUANTITY } from "@/lib/constants/battle-units";
import { useCharacters } from "@/lib/hooks/characters";
import { useUnitPicker } from "@/lib/hooks/units";
import type { AddParticipantData } from "@/types/battle";

interface Options {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: AddParticipantData) => void;
  onPlace?: (data: AddParticipantData) => void;
  isError?: boolean;
}

export function useAddParticipantForm({ campaignId, open, onOpenChange, onAdd, onPlace, isError }: Options) {
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

  // батько закриває діалог в onSuccess — лише тоді скидаємо введене
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

  // помилка: діалог лишився відкритим — Скасувати не має стерти введене
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

  return {
    form: { type, side, characterId, quantity, reserved },
    set: { type: setType, side: setSide, characterId: setCharacterId, quantity: setQuantity, reserved: setReserved },
    characters,
    picker,
    submit: { placing, canSubmit, handleSubmit },
  };
}
