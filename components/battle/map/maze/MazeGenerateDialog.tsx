"use client";

import { type FormEvent, useState } from "react";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import type { MazeGenerateInput } from "@/lib/hooks/battle";
import type { MazeDifficulty } from "@/types/battle";

export const MAX_TELEPORT_PAIRS = 10;

export const MAX_FOG_PATCHES = 20;

export interface MazeCounts {
  teleportPairs: number;
  fogPatches: number;
}

const DIFFICULTY_OPTIONS: { value: MazeDifficulty; label: string }[] = [
  { value: "easy", label: "Легкий" },
  { value: "medium", label: "Середній" },
  { value: "hard", label: "Складний" },
];

const EXIT_OPTIONS: { value: MazeGenerateInput["exit"]; label: string }[] = [
  { value: "random", label: "Випадковий" },
  { value: "pick", label: "Вибрати на карті" },
];

export const DEFAULT_MAZE_COUNTS: MazeCounts = { teleportPairs: 1, fogPatches: 2 };

export function MazeCountsFields({ value, onChange }: { value: MazeCounts; onChange: (next: MazeCounts) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="maze-teleports">Пари телепортів</Label>
        <BoundedNumberInput id="maze-teleports" value={value.teleportPairs} min={0} max={MAX_TELEPORT_PAIRS} onCommit={(teleportPairs) => onChange({ ...value, teleportPairs })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maze-fog">Плями туману</Label>
        <BoundedNumberInput id="maze-fog" value={value.fogPatches} min={0} max={MAX_FOG_PATCHES} onCommit={(fogPatches) => onChange({ ...value, fogPatches })} />
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  difficulty: MazeDifficulty;
  onSubmit: (input: MazeGenerateInput) => void;
}

const FORM_ID = "maze-generate-form";

export function MazeGenerateDialog({ open, onOpenChange, difficulty: initial, onSubmit }: Props) {
  const [difficulty, setDifficulty] = useState(initial);

  const [counts, setCounts] = useState(DEFAULT_MAZE_COUNTS);

  const [exit, setExit] = useState<MazeGenerateInput["exit"]>("random");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ difficulty, ...counts, exit });
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      hud
      title="Згенерувати лабіринт"
      description="Нові стіни, телепорти й туман; герої стануть на краю."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="submit" form={FORM_ID}>
            Згенерувати
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Рівень</Label>
          <SelectField value={difficulty} onValueChange={(v) => setDifficulty(v as MazeDifficulty)} options={DIFFICULTY_OPTIONS} />
        </div>
        <MazeCountsFields value={counts} onChange={setCounts} />
        <div className="space-y-1.5">
          <Label>Вихід</Label>
          <SelectField value={exit} onValueChange={(v) => setExit(v as MazeGenerateInput["exit"])} options={EXIT_OPTIONS} />
        </div>
      </form>
    </ResponsiveDialog>
  );
}
