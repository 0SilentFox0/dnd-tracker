"use client";

import { useState } from "react";

import {
  BattleDialog,
  ConfirmCancelFooter,
} from "@/components/battle/dialogs/shared";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AddParticipantData } from "@/lib/api/battles";
import { useCharacters } from "@/lib/hooks/characters";
import { useUnits } from "@/lib/hooks/units";

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
  const [type, setType] = useState<"character" | "unit">("character");

  const [side, setSide] = useState<"ally" | "enemy">("ally");

  const [characterId, setCharacterId] = useState("");

  const [unitId, setUnitId] = useState("");

  const [quantity, setQuantity] = useState(1);

  const { data: characters = [] } = useCharacters(campaignId);

  const { data: units = [] } = useUnits(campaignId);

  const handleSubmit = () => {
    if (type === "character" && characterId) {
      onAdd({ sourceId: characterId, type: "character", side });
      onOpenChange(false);
      setCharacterId("");
    } else if (type === "unit" && unitId) {
      onAdd({
        sourceId: unitId,
        type: "unit",
        side,
        quantity: quantity || 1,
      });
      onOpenChange(false);
      setUnitId("");
      setQuantity(1);
    }
  };

  const canSubmit =
    type === "character" ? Boolean(characterId) : Boolean(unitId);

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Додати учасника на поле"
      description="Обраний герой або юніт з'явиться одразу після завершення ходу поточного активного гравця."
      contentClassName="bg-slate-900 border-slate-700 text-white max-w-md"
    >
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label className="text-slate-200">Сторона</Label>
          <Select
            value={side}
            onValueChange={(v) => setSide(v as "ally" | "enemy")}
          >
            <SelectTrigger className="bg-slate-800 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ally">Союзник</SelectItem>
              <SelectItem value="enemy">Ворог</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-200">Тип</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as "character" | "unit")}
          >
            <SelectTrigger className="bg-slate-800 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="character">Герой</SelectItem>
              <SelectItem value="unit">Юніт</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === "character" && (
          <div className="space-y-2">
            <Label className="text-slate-200">Герой</Label>
            <Select value={characterId} onValueChange={setCharacterId}>
              <SelectTrigger className="bg-slate-800 border-slate-600">
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
        {type === "unit" && (
          <>
            <div className="space-y-2">
              <Label className="text-slate-200">Юніт</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger className="bg-slate-800 border-slate-600">
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
              <Label className="text-slate-200">Кількість</Label>
              <input
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                  )
                }
                className="flex h-9 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-sm text-white"
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
