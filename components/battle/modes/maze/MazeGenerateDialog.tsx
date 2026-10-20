"use client";

import { type FormEvent, useState } from "react";

import { DEFAULT_MAZE_COUNTS, MazeCountsFields } from "./MazeCountsFields";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { MAZE_DIFFICULTIES } from "@/lib/constants/battle";
import type { MazeGenerateInput } from "@/lib/hooks/battle/modes/maze";
import type { MazeDifficulty } from "@/types/battle";

const DIFFICULTY_LABELS: Record<MazeDifficulty, string> = { easy: "Легкий", medium: "Середній", hard: "Складний" };

const DIFFICULTY_OPTIONS = MAZE_DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value] }));

const EXIT_OPTIONS: { value: MazeGenerateInput["exit"]; label: string }[] = [
  { value: "random", label: "Випадковий" },
  { value: "pick", label: "Вибрати на карті" },
];

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
