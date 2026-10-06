"use client";

import { useState } from "react";

import {
  BattleDialog,
  ConfirmCancelFooter,
} from "@/components/battle/dialogs/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParticipantSourceType, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import { useCharacters } from "@/lib/hooks/characters";
import { useUnits } from "@/lib/hooks/units";
import type { AddParticipantData } from "@/types/battle";

interface AddParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onAdd: (data: AddParticipantData) => void;
  isPending?: boolean;
}

export function AddParticipantDialog({
  open,
  onOpenChange,
  campaignId,
  onAdd,
  isPending,
}: AddParticipantDialogProps) {
  const [type, setType] = useState<ParticipantSourceTypeValue>(ParticipantSourceType.CHARACTER);

  const [side, setSide] = useState<"ally" | "enemy">("ally");

  const [characterId, setCharacterId] = useState("");

  const [unitId, setUnitId] = useState("");

  const [quantity, setQuantity] = useState(1);

  const { data: characters = [] } = useCharacters(campaignId, { compact: true, enabled: open });

  const { data: units = [] } = useUnits(campaignId, undefined, { enabled: open });

  const handleSubmit = () => {
    if (type === ParticipantSourceType.CHARACTER && characterId) {
      onAdd({ sourceId: characterId, type: ParticipantSourceType.CHARACTER, side });
      onOpenChange(false);
      setCharacterId("");
    } else if (type === ParticipantSourceType.UNIT && unitId) {
      onAdd({
        sourceId: unitId,
        type: ParticipantSourceType.UNIT,
        side,
        quantity: quantity || 1,
      });
      onOpenChange(false);
      setUnitId("");
      setQuantity(1);
    }
  };

  const canSubmit =
    type === ParticipantSourceType.CHARACTER ? Boolean(characterId) : Boolean(unitId);

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Додати учасника на поле"
      description="Обраний герой або юніт з'явиться одразу після завершення ходу поточного активного гравця."
    >
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Сторона</Label>
          <Select
            value={side}
            onValueChange={(v) => setSide(v as "ally" | "enemy")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ally">Союзник</SelectItem>
              <SelectItem value="enemy">Ворог</SelectItem>
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
              <Label>Юніт</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Оберіть юніта" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Кількість</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                  )
                }
              />
            </div>
          </>
        )}
        <ConfirmCancelFooter
          onCancel={() => onOpenChange(false)}
          confirmLabel="Додати"
          onConfirm={handleSubmit}
          confirmDisabled={!canSubmit || isPending}
          confirmLoading={isPending}
          confirmLoadingLabel="Додаємо…"
        />
      </div>
    </BattleDialog>
  );
}
