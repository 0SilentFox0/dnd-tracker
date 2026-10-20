"use client";

import { type ReactNode, useState } from "react";

import { MazeGenerateDialog } from "./MazeGenerateDialog";
import { MazeReshuffleDialog } from "./MazeReshuffleDialog";

import { SelectField } from "@/components/ui/select-field";
import { type MazeTool, type MazeTools, useBattleSceneData } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

const EDIT_TOOLS: { value: MazeTool; label: string }[] = [
  { value: "walls", label: "Стіни" },
  { value: "exit", label: "Вихід" },
  { value: "teleport", label: "Телепорт" },
  { value: "fog", label: "Туман" },
];

const isEditTool = (t: MazeTool) => EDIT_TOOLS.some((e) => e.value === t);

const NO_HERO = "none";

function ToolButton({ active, onClick, tall, label, children }: { active?: boolean; onClick: () => void; tall: boolean; label?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        tall ? "h-8" : "h-7",
        "shrink-0 rounded-md border bg-black/60 px-2 text-xs hover:bg-black/80",
        active ? "border-[var(--gold)] text-hud-gold-bright" : "border-hud-rule text-hud-muted",
      )}
    >
      {children}
    </button>
  );
}

export function MazeToolbar({ tools, tall }: { tools: MazeTools; tall: boolean }) {
  const [dialog, setDialog] = useState<"generate" | "reshuffle" | null>(null);

  const { battle } = useBattleSceneData();

  const { canGenerate, tool, setTool, dark, asHero, heroes } = tools;

  const editing = isEditTool(tool);

  const close = (open: boolean) => !open && setDialog(null);

  return (
    <>
      {canGenerate ? (
        <ToolButton tall={tall} onClick={() => setDialog("generate")}>
          Згенерувати
        </ToolButton>
      ) : (
        <ToolButton tall={tall} onClick={() => setDialog("reshuffle")}>
          Перетасувати
        </ToolButton>
      )}
      <ToolButton tall={tall} active={editing} onClick={() => setTool(editing ? "none" : "walls")}>
        Правити
      </ToolButton>
      <ToolButton tall={tall} active={dark} onClick={tools.toggleDark}>
        Темрява
      </ToolButton>
      {canGenerate && (
        <ToolButton tall={tall} onClick={tools.scatterStarts}>
          Розкидати старти
        </ToolButton>
      )}
      <label className="flex shrink-0 items-center gap-1 text-xs text-hud-muted">
        Очима гравця
        <SelectField
          value={asHero.id ?? NO_HERO}
          onValueChange={(v) => asHero.set(v === NO_HERO ? null : v)}
          options={[{ value: NO_HERO, label: "Вимкнено" }, ...heroes.map((h) => ({ value: h.id, label: h.name }))]}
          className={cn(tall ? "h-8" : "h-7", "w-32 px-2 text-xs")}
        />
      </label>
      {/* вихід із погляду гравця не залежить від того, чи вміщується список під тригером */}
      {asHero.id && (
        <ToolButton tall={tall} onClick={() => asHero.set(null)} label="Вимкнути «Очима гравця»">
          Вимкнути
        </ToolButton>
      )}
      {dialog === "generate" && <MazeGenerateDialog open onOpenChange={close} difficulty={battle.map?.maze?.difficulty ?? "medium"} onSubmit={tools.generate} />}
      {dialog === "reshuffle" && <MazeReshuffleDialog open onOpenChange={close} onSubmit={tools.reshuffle} />}
    </>
  );
}

const HINTS: Partial<Record<MazeTool, string>> = {
  walls: "Клацніть або протягніть уздовж ребер; перше ребро вирішує — ставити чи прибирати",
  exit: "Клацніть крайню клітинку",
  teleport: "Дві клітинки — пара; клацання по телепорту прибирає пару",
  fog: "Клацання вмикає або вимикає туман у клітинці",
  placeUnit: "Клацніть клітинку для юніта",
};

/** Підрежими «Правити» й підказка активного інструмента. */
export function MazeEditPalette({ tools }: { tools: MazeTools }) {
  const { tool, setTool, awaitingExit } = tools;

  if (tool === "none") return null;

  const hint = awaitingExit ? "Клацніть крайню клітинку для виходу нового лабіринту" : HINTS[tool];

  return (
    <div className="flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs">
      {isEditTool(tool) &&
        !awaitingExit &&
        EDIT_TOOLS.map(({ value, label }) => (
          <ToolButton key={value} tall={false} active={tool === value} onClick={() => setTool(value)}>
            {label}
          </ToolButton>
        ))}
      <span className="text-hud-muted">{hint} · Esc — вийти</span>
    </div>
  );
}
