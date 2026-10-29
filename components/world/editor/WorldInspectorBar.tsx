"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Crosshair, ImageUp, Map as MapIcon, MapPinned, MessagesSquare, NotebookPen, PenLine, Trash2, X } from "lucide-react";

import { DmMarkerNotes } from "./DmMarkerNotes";
import { ICON_OPTIONS,markerIcon } from "./marker-icon-options";
import { NewWorldMapDialog } from "./NewWorldMapDialog";
import { useWorldEditorContext } from "./WorldEditorContext";
import { RADIUS_STEP } from "./WorldMapSettings";

import { ColorSwatch } from "@/components/common/ColorSwatch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HudPortalClassProvider } from "@/components/ui/portal-class";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { REVEAL_RADIUS_RANGE, WORLD_DM_NOTE_MAX, WORLD_NAME_MAX } from "@/lib/constants/world";
import { useMapFields, useMarkerFields } from "@/lib/hooks/world";
import { cn } from "@/lib/utils";
import type { WorldMapDetail, WorldMarker } from "@/types/world";

const ROW = "hud-scroll-x flex min-h-12 items-center gap-x-2 gap-y-2 overflow-x-auto px-2 py-1.5 max-lg:flex-wrap";

const CHIP = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-hud-rule bg-black/40 px-2.5 text-sm text-hud-ink hover:border-[var(--gold)] disabled:opacity-40";

const MEDALLION = "metal-gold metal-fill flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]";

const POPOVER = "border-hud-rule bg-[rgba(17,14,11,.99)]";

export function WorldInspectorBar({ open, onClose }: { open: boolean; onClose(): void }) {
  const { detail, selectedId } = useWorldEditorContext();

  const t = useTranslations("world.editor");

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;

      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

      onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const marker = selectedId ? detail?.markers.find((m) => m.id === selectedId) : undefined;

  let content: ReactNode;

  if (!open || !detail) content = <p className="px-1 text-xs text-hud-muted">{t("inspectorEmpty")}</p>;
  else if (marker) content = <MarkerStrip key={marker.id} marker={marker} onClose={onClose} />;
  else content = <MapStrip key={detail.map.id} detail={detail} onClose={onClose} />;

  return (
    <HudPortalClassProvider value="hud-surface">
      <div role="region" aria-label={t("inspector")} className={cn(ROW, "border-t border-hud-rule", !open && "text-hud-muted")}>
        {content}
      </div>
    </HudPortalClassProvider>
  );
}

function CloseButton({ onClose }: { onClose(): void }) {
  const t = useTranslations("world.editor");

  return (
    <button type="button" aria-label={t("closePanel")} onClick={onClose} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-hud-rule text-hud-muted hover:bg-white/10 hover:text-hud-ink">
      <X className="size-4" aria-hidden />
    </button>
  );
}

function DeleteButton({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-hud-danger/60 bg-hud-danger/20 px-3 text-sm font-medium text-hud-danger transition-colors hover:bg-hud-danger/30 hover:text-hud-bad">
      <Trash2 className="size-4" aria-hidden />
      {label}
    </button>
  );
}

function SwitchField({ label, title, checked, onChange }: { label: string; title?: string; checked: boolean; onChange(v: boolean): void }) {
  return (
    <label title={title} className="flex shrink-0 items-center gap-2 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

function MarkerStrip({ marker, onClose }: { marker: WorldMarker; onClose(): void }) {
  const { editor, select, openMap, redraw, redrawId } = useWorldEditorContext();

  const t = useTranslations("world");

  const [creating, setCreating] = useState(false);

  const [iconOpen, setIconOpen] = useState(false);

  const { name, setName, commitName, note, setNote, commitNote, color, pickColor, save, remove } = useMarkerFields({ marker, editor, select });

  const redrawing = redrawId === marker.id;

  const Icon = markerIcon(marker);

  return (
    <>
      <span className="flex shrink-0 items-center gap-2">
        <span className={MEDALLION}>
          <Icon className="size-4 text-[#2a1d05]" aria-hidden />
        </span>
        <span className="hud-sc hidden text-xs text-hud-muted xl:inline">{t(`shape.${marker.kind}`)}</span>
      </span>
      <Input
        aria-label={t("name")}
        className="h-9 w-44 shrink-0"
        maxLength={WORLD_NAME_MAX}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {marker.kind === "point" ? (
        <Popover open={iconOpen} onOpenChange={setIconOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-label={t("editor.icon")} title={t("editor.icon")} className={CHIP}>
              <Icon className="size-4" aria-hidden />
              {t("editor.icon")}
            </button>
          </PopoverTrigger>
          <PopoverContent className={POPOVER}>
            <div role="group" aria-label={t("editor.icons")} className="grid grid-cols-4 gap-1.5">
              {ICON_OPTIONS.map(({ value, Icon: Option }) => (
                <button
                  key={value}
                  type="button"
                  title={t(`markerKinds.${value}`)}
                  aria-label={t(`markerKinds.${value}`)}
                  aria-pressed={marker.icon === value}
                  onClick={() => {
                    void save({ icon: value });
                    setIconOpen(false);
                  }}
                  className={cn("flex size-10 items-center justify-center rounded-md border bg-black/40 text-hud-muted hover:text-hud-ink", marker.icon === value ? "metal-gold metal-fill border-[var(--gold)]" : "border-hud-rule")}
                >
                  <Option className="size-5" aria-hidden />
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <>
          <ColorSwatch color={color} label={t("editor.zoneColor")} onChange={pickColor} />
          <Button type="button" size="sm" variant={redrawing ? "default" : "outline"} onClick={() => redraw(redrawing ? null : marker.id)} className="h-9 shrink-0 gap-1.5" aria-label={redrawing ? t("editor.drawNewZone") : t("editor.redrawOutline")}>
            <PenLine className="size-4" />
            {redrawing ? t("editor.drawing") : t("editor.outline")}
          </Button>
        </>
      )}
      <SwitchField label={t("editor.knownLocation")} title={t("editor.knownLocationHint")} checked={marker.alwaysVisible} onChange={(v) => void save({ alwaysVisible: v })} />
      <Button type="button" size="sm" variant="outline" onClick={() => (marker.childMapId ? openMap(marker.childMapId) : setCreating(true))} className="h-9 shrink-0 gap-1.5" aria-label={marker.childMapId ? t("editor.openChild") : t("editor.createChild")}>
        <MapPinned className="size-4" />
        {marker.childMapId ? t("editor.childMap") : t("editor.createMap")}
      </Button>
      <Popover onOpenChange={(o) => !o && commitNote()}>
        <PopoverTrigger asChild>
          <button type="button" className={CHIP}>
            <NotebookPen className="size-4" aria-hidden />
            {t("editor.note")}
            {note.trim() ? <span aria-hidden className="size-1.5 rounded-full bg-[var(--gold)]" /> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn(POPOVER, "w-72")}>
          <Textarea aria-label={t("editor.dmNote")} rows={5} value={note} maxLength={WORLD_DM_NOTE_MAX} onChange={(e) => setNote(e.target.value)} onBlur={commitNote} />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={CHIP}>
            <MessagesSquare className="size-4" aria-hidden />
            {t("editor.playerNotes")}
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn(POPOVER, "max-h-96 w-80 overflow-y-auto")}>
          <DmMarkerNotes marker={marker} />
        </PopoverContent>
      </Popover>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        <DeleteButton label={t("editor.delete")} onClick={() => void remove()} />
        <CloseButton onClose={onClose} />
      </span>
      <NewWorldMapDialog open={creating} onOpenChange={setCreating} parentMarker={{ id: marker.id, name: marker.name }} />
    </>
  );
}

function MapStrip({ detail, onClose }: { detail: WorldMapDetail; onClose(): void }) {
  const { campaignId, maps, editor, openMap, tool, setTool } = useWorldEditorContext();

  const t = useTranslations("world");

  const fileInput = useRef<HTMLInputElement>(null);

  const { map, name, setName, commitName, radius, setRadius, commitRadius, fill, children, save, replaceImage, remove } = useMapFields({ campaignId, detail, maps, editor, openMap });

  return (
    <>
      <span className="flex shrink-0 items-center gap-2">
        <span className={MEDALLION}>
          <MapIcon className="size-4 text-[#2a1d05]" aria-hidden />
        </span>
        <span className="hud-sc text-xs text-hud-muted">{map.parentMapId ? t("mapKind.nested") : t("mapKind.root")}</span>
      </span>
      <Input
        aria-label={t("name")}
        className="h-9 w-44 shrink-0"
        maxLength={WORLD_NAME_MAX}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
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
