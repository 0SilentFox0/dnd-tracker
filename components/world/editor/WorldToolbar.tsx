"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, CornerLeftUp, LogIn, type LucideIcon, MapPin, MousePointer2, Navigation, Pentagon, Settings2, Undo2 } from "lucide-react";

import { useWorldEditorContext } from "./WorldEditorContext";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { useMapDrawing, WorldTool } from "@/lib/hooks/world";
import { cn } from "@/lib/utils";

const TOOLS = [
  { key: "select", hotkey: "V", Icon: MousePointer2 },
  { key: "point", hotkey: "P", Icon: MapPin },
  { key: "zone", hotkey: "Z", Icon: Pentagon },
  { key: "entry", hotkey: "E", Icon: LogIn },
  { key: "move", hotkey: "M", Icon: Navigation },
] as const satisfies { key: WorldTool; hotkey: string; Icon: LucideIcon }[];

const BUTTON = "inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-hud-rule bg-[rgba(46,36,26,.95)] text-hud-ink transition-colors hover:bg-[rgba(70,54,38,.98)] disabled:opacity-40 disabled:hover:bg-[rgba(46,36,26,.95)] lg:size-10";

function ToolButton({ label, hotkey, Icon, active, disabled, onClick }: { label: string; hotkey?: string; Icon: LucideIcon; active?: boolean; disabled?: boolean; onClick(): void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick} className={cn(BUTTON, active && "metal-gold metal-fill border-[var(--gold)] hover:bg-transparent")}>
          <Icon className="size-5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {hotkey ? <kbd className="ml-2 rounded border border-white/30 px-1 font-mono">{hotkey}</kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function WorldToolbar({ drawing, readOnly = false, onSettings, inspector, children }: { drawing: ReturnType<typeof useMapDrawing>; readOnly?: boolean; onSettings?(): void; inspector?: ReactNode; children?: ReactNode }) {
  const { detail, maps, openMap } = useWorldEditorContext();

  const t = useTranslations("world.toolbar");

  const { tool, setTool, draft, finish, undoVertex } = drawing;

  const parent = detail?.map.parentMapId ? maps.find((m) => m.id === detail.map.parentMapId) : undefined;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-md border border-hud-rule bg-[rgba(17,14,11,.97)]">
      <div className="flex flex-col lg:flex-row lg:items-center">
      <div role="group" aria-label={t("group")} className="hud-scroll-x flex w-full items-center gap-1 overflow-x-auto p-1 lg:min-w-0 lg:flex-1">
        {TOOLS.map(({ key, hotkey, Icon }) => (
          <ToolButton key={key} label={t(key)} hotkey={hotkey} Icon={Icon} active={tool === key} disabled={readOnly} onClick={() => setTool(key)} />
        ))}
        {tool === "zone" ? (
          <>
            <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-hud-rule" />
            <ToolButton label={t("closeZone")} Icon={Check} disabled={draft.length < 3} onClick={finish} />
            <ToolButton label={t("undoVertex")} hotkey="⌫" Icon={Undo2} disabled={draft.length === 0} onClick={undoVertex} />
          </>
        ) : null}
        {parent ? (
          <>
            <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-hud-rule" />
            <button type="button" aria-label={t("toParent", { name: parent.name })} onClick={() => openMap(parent.id)} className={cn(BUTTON, "w-auto max-w-40 gap-1 px-2 text-xs lg:w-auto")}>
              <CornerLeftUp className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{parent.name}</span>
            </button>
          </>
        ) : null}
        {onSettings ? <ToolButton label={t("settings")} Icon={Settings2} disabled={readOnly} onClick={onSettings} /> : null}
      </div>
        {children ? <div data-slot="toolbar-extras" className="flex shrink-0 items-center gap-1 border-t border-hud-rule p-1 lg:border-t-0 lg:pl-2">{children}</div> : null}
      </div>
      {inspector}
      </div>
    </TooltipProvider>
  );
}

const KEY = "font-normal text-hud-gold-bright";

export function WorldToolHint({ tool, vertices }: { tool: WorldTool; vertices: number }) {
  const t = useTranslations("world.hint");

  if (tool === "select") return null;

  const key = (chunks: ReactNode) => <b className={KEY}>{chunks}</b>;

  return (
    <p role="status" className="pointer-events-none max-w-[min(34rem,calc(100%-1rem))] rounded-md border border-[var(--gold)]/60 bg-black/80 px-3 py-1.5 text-center text-xs text-hud-ink">
      {t.rich(tool, { key, vertices })}
    </p>
  );
}
