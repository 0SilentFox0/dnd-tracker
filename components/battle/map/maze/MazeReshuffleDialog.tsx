"use client";

import { type FormEvent, useState } from "react";

import { DEFAULT_MAZE_COUNTS, MazeCountsFields } from "./MazeGenerateDialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import type { MazeReshuffleMode, MazeTools } from "@/lib/hooks/battle";

const MODE_OPTIONS: { value: MazeReshuffleMode; label: string }[] = [
  { value: "walls", label: "Лише стіни" },
  { value: "scatter", label: "Стіни + розкидати всіх" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: MazeTools["reshuffle"];
}

const FORM_ID = "maze-reshuffle-form";

export function MazeReshuffleDialog({ open, onOpenChange, onSubmit }: Props) {
  const [mode, setMode] = useState<MazeReshuffleMode>("walls");

  const [counts, setCounts] = useState(DEFAULT_MAZE_COUNTS);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(mode, counts);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      hud
      title="Перетасувати лабіринт"
      description="Вихід лишається на місці; нікого не буде замуровано."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="submit" form={FORM_ID}>
            Перетасувати
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Режим</Label>
          <SelectField value={mode} onValueChange={(v) => setMode(v as MazeReshuffleMode)} options={MODE_OPTIONS} />
        </div>
        <MazeCountsFields value={counts} onChange={setCounts} />
      </form>
    </ResponsiveDialog>
  );
}
