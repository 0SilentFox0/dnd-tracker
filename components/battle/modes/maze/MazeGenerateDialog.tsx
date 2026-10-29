"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { DEFAULT_MAZE_COUNTS, MazeCountsFields } from "./MazeCountsFields";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { MAZE_DIFFICULTIES } from "@/lib/constants/battle";
import type { MazeGenerateInput } from "@/lib/hooks/battle/modes/maze";
import type { MazeDifficulty } from "@/types/battle";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  difficulty: MazeDifficulty;
  onSubmit: (input: MazeGenerateInput) => void;
}

const FORM_ID = "maze-generate-form";

export function MazeGenerateDialog({ open, onOpenChange, difficulty: initial, onSubmit }: Props) {
  const t = useTranslations("battleDm.maze");

  const tActions = useTranslations("common.actions");

  const difficultyOptions = MAZE_DIFFICULTIES.map((value) => ({ value, label: t(`difficulty.${value}`) }));

  const exitOptions: { value: MazeGenerateInput["exit"]; label: string }[] = [
    { value: "random", label: t("generate.exitRandom") },
    { value: "pick", label: t("generate.exitPick") },
  ];

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
      title={t("generate.title")}
      description={t("generate.description")}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tActions("cancel")}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {t("generate.submit")}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>{t("generate.level")}</Label>
          <SelectField value={difficulty} onValueChange={(v) => setDifficulty(v as MazeDifficulty)} options={difficultyOptions} />
        </div>
        <MazeCountsFields value={counts} onChange={setCounts} />
        <div className="space-y-1.5">
          <Label>{t("generate.exit")}</Label>
          <SelectField value={exit} onValueChange={(v) => setExit(v as MazeGenerateInput["exit"])} options={exitOptions} />
        </div>
      </form>
    </ResponsiveDialog>
  );
}
