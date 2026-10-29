"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { DEFAULT_MAZE_COUNTS, MazeCountsFields } from "./MazeCountsFields";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import type { MazeReshuffleMode, MazeToolsActions } from "@/lib/hooks/battle/modes/maze";

const MODES = ["walls", "scatter", "tunnel"] as const satisfies readonly MazeReshuffleMode[];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: MazeToolsActions["reshuffle"];
}

const FORM_ID = "maze-reshuffle-form";

export function MazeReshuffleDialog({ open, onOpenChange, onSubmit }: Props) {
  const t = useTranslations("battleDm.maze.reshuffle");

  const tActions = useTranslations("common.actions");

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
      title={t("title")}
      description={t(`descriptions.${mode}`)}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tActions("cancel")}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {t("submit")}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>{t("mode")}</Label>
          <SelectField value={mode} onValueChange={(v) => setMode(v as MazeReshuffleMode)} options={MODES.map((value) => ({ value, label: t(`modes.${value}`) }))} />
        </div>
        {mode !== "tunnel" && <MazeCountsFields value={counts} onChange={setCounts} />}
      </form>
    </ResponsiveDialog>
  );
}
