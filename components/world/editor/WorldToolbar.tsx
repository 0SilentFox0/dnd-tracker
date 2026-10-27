"use client";

import { Check, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { useMapDrawing, WorldTool } from "@/lib/hooks/world";

const TOOLS: { key: WorldTool; label: string }[] = [
  { key: "select", label: "Вибір" },
  { key: "point", label: "Точка" },
  { key: "zone", label: "Зона" },
];

export function WorldToolbar({ drawing }: { drawing: ReturnType<typeof useMapDrawing> }) {
  const { tool, setTool, draft, finish, undoVertex } = drawing;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Інструменти" className="flex gap-1">
        {TOOLS.map((t) => (
          <Button key={t.key} type="button" size="sm" variant={tool === t.key ? "default" : "outline"} aria-pressed={tool === t.key} onClick={() => setTool(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>
      {tool === "zone" ? (
        <>
          <span className="text-xs text-hud-muted">Клік — вершина, подвійний клік — замкнути, Esc — скасувати</span>
          <Button type="button" size="sm" variant="outline" disabled={draft.length < 3} onClick={finish} className="gap-1">
            <Check className="size-4" />
            Готово
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={draft.length === 0} onClick={undoVertex} className="gap-1">
            <Undo2 className="size-4" />
            Крок назад
          </Button>
        </>
      ) : null}
      {tool === "point" ? <span className="text-xs text-hud-muted">Клік по карті — нова точка</span> : null}
      {tool === "entry" ? <span className="text-xs text-hud-muted">Клік по карті — точка входу</span> : null}
    </div>
  );
}
