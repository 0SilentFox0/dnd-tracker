"use client";

import { type CSSProperties, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Crosshair, ImageUp, Map as MapIcon } from "lucide-react";

import { CHIP, CloseButton, DeleteButton, NameInput, POPOVER, StripLead, SwitchField } from "./InspectorParts";
import { useWorldEditorContext } from "./WorldEditorContext";
import { RADIUS_STEP } from "./WorldMapSettings";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { REVEAL_RADIUS_RANGE } from "@/lib/constants/world";
import { useMapFields } from "@/lib/hooks/world";
import { cn } from "@/lib/utils";
import type { WorldMapDetail } from "@/types/world";

export function MapStrip({ detail, onClose }: { detail: WorldMapDetail; onClose(): void }) {
  const { campaignId, maps, editor, openMap, tool, setTool } = useWorldEditorContext();

  const t = useTranslations("world");

  const fileInput = useRef<HTMLInputElement>(null);

  const { map, name, setName, commitName, radius, setRadius, commitRadius, fill, children, save, replaceImage, remove } = useMapFields({ campaignId, detail, maps, editor, openMap });

  return (
    <>
      <StripLead icon={MapIcon} label={map.parentMapId ? t("mapKind.nested") : t("mapKind.root")} />
      <NameInput value={name} onChange={setName} onCommit={commitName} />
      <SwitchField label={t("editor.fog")} title={t("editor.fogHide")} checked={map.fogEnabled} onChange={(v) => void save({ fogEnabled: v })} />
      <label className="flex shrink-0 items-center gap-2 text-sm">
        {t("editor.radius")}
        <input
          type="range"
          aria-label={t("editor.radiusView")}
          className="hud-range w-32"
          style={{ "--fill": `${fill}%` } as CSSProperties}
          min={REVEAL_RADIUS_RANGE.min}
          max={REVEAL_RADIUS_RANGE.max}
          step={RADIUS_STEP}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          onPointerUp={commitRadius}
          onKeyUp={commitRadius}
          onBlur={commitRadius}
        />
        <span className="w-10 font-mono text-hud-gold-bright">{Math.round(radius * 100)}%</span>
      </label>
      <Button type="button" size="sm" variant={tool === "entry" ? "default" : "outline"} onClick={() => setTool(tool === "entry" ? "select" : "entry")} className="h-9 gap-1.5">
        <Crosshair className="size-4" />
        {tool === "entry" ? t("editor.entryPlacing") : t("editor.entryOnMap")}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={CHIP}>
            {t("editor.children", { count: children.length })}
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn(POPOVER, "w-60")}>
          {children.length ? (
            <ul className="space-y-1">
              {children.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => openMap(m.id)} className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-hud-rule bg-black/30 px-3 text-left text-sm hover:border-[var(--gold)]">
                    <span className="truncate">{m.name}</span>
                    <ChevronRight className="size-4 shrink-0 text-hud-muted" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-hud-muted">{t("editor.childrenEmpty")}</p>
          )}
        </PopoverContent>
      </Popover>
      <Button type="button" size="sm" variant="outline" title={`${map.width}×${map.height} px`} onClick={() => fileInput.current?.click()} className="h-9 gap-1.5">
        <ImageUp className="size-4" />
        {t("editor.replaceImage")}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];

          e.target.value = "";

          if (file) void replaceImage(file);
        }}
      />
      <span className="ml-auto flex shrink-0 items-center gap-2">
        <DeleteButton label={t("editor.deleteMap")} onClick={() => void remove()} />
        <CloseButton onClose={onClose} />
      </span>
    </>
  );
}
