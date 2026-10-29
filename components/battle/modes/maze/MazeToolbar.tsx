"use client";

import { type ReactNode, useState } from "react";
import { useTranslations } from "next-intl";

import { MazeGenerateDialog } from "./MazeGenerateDialog";
import { MazeReshuffleDialog } from "./MazeReshuffleDialog";

import { SelectField } from "@/components/ui/select-field";
import { useBattleSceneData } from "@/lib/hooks/battle";
import { type MazeTool, type MazeTools } from "@/lib/hooks/battle/modes/maze";
import { cn } from "@/lib/utils";

const EDIT_TOOLS = ["walls", "exit", "teleport", "fog"] as const satisfies readonly MazeTool[];

const isEditTool = (tool: MazeTool) => (EDIT_TOOLS as readonly MazeTool[]).includes(tool);

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
  const t = useTranslations("battleDm.maze");

  const [dialog, setDialog] = useState<"generate" | "reshuffle" | null>(null);

  const { battle } = useBattleSceneData();

  const { state: { canGenerate, tool, dark, heroes }, actions, asHero } = tools;

  const editing = isEditTool(tool);

  const close = (open: boolean) => !open && setDialog(null);

  return (
    <>
      {canGenerate ? (
        <ToolButton tall={tall} onClick={() => setDialog("generate")}>
          {t("toolbar.generate")}
        </ToolButton>
      ) : (
        <ToolButton tall={tall} onClick={() => setDialog("reshuffle")}>
          {t("toolbar.reshuffle")}
        </ToolButton>
      )}
      <ToolButton tall={tall} active={editing} onClick={() => actions.setTool(editing ? "none" : "walls")}>
        {t("toolbar.edit")}
      </ToolButton>
      <ToolButton tall={tall} active={dark} onClick={actions.toggleDark}>
        {t("toolbar.dark")}
      </ToolButton>
      {canGenerate && (
        <ToolButton tall={tall} onClick={actions.scatterStarts}>
          {t("toolbar.scatterStarts")}
        </ToolButton>
      )}
      <label className="flex shrink-0 items-center gap-1 text-xs text-hud-muted">
        {t("toolbar.asHero")}
        <SelectField
          value={asHero.id ?? NO_HERO}
          onValueChange={(v) => asHero.set(v === NO_HERO ? null : v)}
          options={[{ value: NO_HERO, label: t("toolbar.asHeroOff") }, ...heroes.map((h) => ({ value: h.id, label: h.name }))]}
          className={cn(tall ? "h-8" : "h-7", "w-32 px-2 text-xs")}
        />
      </label>
      {/* leaving the player view must not depend on whether the list fits under the trigger */}
      {asHero.id && (
        <ToolButton tall={tall} onClick={() => asHero.set(null)} label={t("toolbar.asHeroExitLabel")}>
          {t("toolbar.asHeroExit")}
        </ToolButton>
      )}
      {dialog === "generate" && <MazeGenerateDialog open onOpenChange={close} difficulty={battle.map?.maze?.difficulty ?? "medium"} onSubmit={actions.generate} />}
      {dialog === "reshuffle" && <MazeReshuffleDialog open onOpenChange={close} onSubmit={actions.reshuffle} />}
    </>
  );
}

const HINT_TOOLS = ["walls", "exit", "teleport", "fog", "placeUnit"] as const;

const hasHint = (tool: MazeTool): tool is (typeof HINT_TOOLS)[number] => (HINT_TOOLS as readonly MazeTool[]).includes(tool);

export function MazeEditPalette({ tools }: { tools: MazeTools }) {
  const t = useTranslations("battleDm.maze");

  const { state: { tool, awaitingExit }, actions: { setTool } } = tools;

  if (tool === "none") return null;

  const hint = awaitingExit ? t("hints.awaitingExit") : hasHint(tool) ? t(`hints.${tool}`) : "";

  return (
    <div className="flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs">
      {isEditTool(tool) &&
        !awaitingExit &&
        EDIT_TOOLS.map((value) => (
          <ToolButton key={value} tall={false} active={tool === value} onClick={() => setTool(value)}>
            {t(`tools.${value}`)}
          </ToolButton>
        ))}
      <span className="text-hud-muted">{t("palette", { hint })}</span>
    </div>
  );
}
