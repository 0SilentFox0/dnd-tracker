"use client";

import { type CSSProperties, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Crosshair, ImageUp, Map as MapIcon } from "lucide-react";

import { useWorldEditorContext } from "./WorldEditorContext";
import { QuietDeleteButton, WorldPanelHeader } from "./WorldPanelHeader";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Switch } from "@/components/ui/switch";
import { REVEAL_RADIUS_RANGE, WORLD_NAME_MAX } from "@/lib/constants/world";
import { useMapFields } from "@/lib/hooks/world";
import type { WorldMapDetail } from "@/types/world";

export const RADIUS_STEP = 0.005;

export function WorldMapSettings() {
  const { detail } = useWorldEditorContext();

  return detail ? <MapForm detail={detail} /> : null;
}

function MapForm({ detail }: { detail: WorldMapDetail }) {
  const { campaignId, maps, editor, openMap, tool, setTool } = useWorldEditorContext();

  const t = useTranslations("world");

  const fileInput = useRef<HTMLInputElement>(null);

  const { map, name, setName, commitName, radius, setRadius, commitRadius, fill, children, save, replaceImage, remove } = useMapFields({ campaignId, detail, maps, editor, openMap });

  return (
    <div>
      <WorldPanelHeader badge={<MapIcon className="size-5 text-[#2a1d05]" aria-hidden />} title={map.name} subtitle={map.parentMapId ? t("mapKind.nested") : t("mapKind.root")} />
      <HudSection title={t("editor.basic")}>
        <LabeledInput label={t("name")} maxLength={WORLD_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} />
      </HudSection>
      <HudSection title={t("editor.fog")}>
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-3 text-sm">
            {t("editor.fogHide")}
            <Switch checked={map.fogEnabled} onCheckedChange={(v) => void save({ fogEnabled: v })} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="flex items-center justify-between">
              {t("editor.radiusView")}
              <span className="font-mono text-hud-gold-bright">{Math.round(radius * 100)}%</span>
            </span>
            <input
              type="range"
              className="hud-range"
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
          </label>
        </div>
      </HudSection>
      <HudSection title={t("editor.entry")}>
        <Button type="button" variant={tool === "entry" ? "default" : "outline"} onClick={() => setTool(tool === "entry" ? "select" : "entry")} className="w-full gap-2">
          <Crosshair className="size-4" />
          {tool === "entry" ? t("editor.entryPlacing") : t("editor.entrySet")}
        </Button>
      </HudSection>
      <HudSection title={t("editor.children", { count: children.length })}>
        {children.length ? (
          <ul className="space-y-1">
            {children.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => openMap(m.id)} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-hud-rule bg-black/30 px-3 text-left text-sm hover:border-[var(--gold)]">
                  <span className="truncate">{m.name}</span>
                  <ChevronRight className="size-4 shrink-0 text-hud-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-hud-muted">{t("editor.childrenEmpty")}</p>
        )}
      </HudSection>
      <HudSection title={t("editor.image")}>
        <p className="mb-2 text-xs text-hud-muted">
          {map.width}×{map.height} px
        </p>
        <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} className="w-full gap-2">
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
      </HudSection>
      <QuietDeleteButton label={t("editor.deleteMap")} onClick={() => void remove()} />
    </div>
  );
}
