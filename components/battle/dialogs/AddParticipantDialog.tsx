"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCharacters } from "@/lib/hooks/useCharacters";
import { useUnits } from "@/lib/hooks/useUnits";
import type { AddParticipantData } from "@/lib/api/battles";

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
  const [characterId, setCharacterId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Додати учасника на поле</DialogTitle>
          <DialogDescription className="text-slate-300">
            Обраний герой або юніт з&apos;явиться одразу після завершення ходу
            поточного активного гравця.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Сторона</Label>
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
            <Label>Тип</Label>
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
              <Label>Герой</Label>
              <Select
                value={characterId}
                onValueChange={setCharacterId}
              >
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
                <Label>Юніт</Label>
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
                <Label>Кількість</Label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Math.min(10, +e.target.value || 1)))
                  }
                  className="flex h-9 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-sm text-white"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300"
          >
            Скасувати
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              (type === "character" ? !characterId : !unitId)
            }
          >
            {isPending ? "Додаємо…" : "Додати"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
