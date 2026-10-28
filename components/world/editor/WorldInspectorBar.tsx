"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronRight, Crosshair, ImageUp, Map as MapIcon, MapPinned, NotebookPen, PenLine, Trash2, X } from "lucide-react";

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

const ROW = "flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 px-2 py-1.5";

const CHIP = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-hud-rule bg-black/40 px-2.5 text-sm text-hud-ink hover:border-[var(--gold)] disabled:opacity-40";

const MEDALLION = "metal-gold metal-fill flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]";

const POPOVER = "border-hud-rule bg-[rgba(17,14,11,.99)]";

export function WorldInspectorBar({ open, onClose }: { open: boolean; onClose(): void }) {
  const { detail, selectedId } = useWorldEditorContext();

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

  if (!open || !detail) content = <p className="px-1 text-xs text-hud-muted">Оберіть точку чи зону на карті — тут з&apos;являться її параметри.</p>;
  else if (marker) content = <MarkerStrip key={marker.id} marker={marker} onClose={onClose} />;
  else content = <MapStrip key={detail.map.id} detail={detail} onClose={onClose} />;

  return (
    <HudPortalClassProvider value="hud-surface">
      <div role="region" aria-label="Інспектор" className={cn(ROW, "border-t border-hud-rule", !open && "text-hud-muted")}>
        {content}
      </div>
    </HudPortalClassProvider>
  );
}

function CloseButton({ onClose }: { onClose(): void }) {
  return (
    <button type="button" aria-label="Закрити панель" onClick={onClose} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-hud-rule text-hud-muted hover:bg-white/10 hover:text-hud-ink">
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
        <span className="hud-sc text-xs text-hud-muted">{marker.kind === "zone" ? "Зона" : "Точка"}</span>
      </span>
      <Input
        aria-label="Назва"
        className="h-9 w-48"
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
            <button type="button" aria-label="Іконка" title="Іконка" className={CHIP}>
              <Icon className="size-4" aria-hidden />
              Іконка
            </button>
          </PopoverTrigger>
          <PopoverContent className={POPOVER}>
            <div role="group" aria-label="Іконки" className="grid grid-cols-4 gap-1.5">
              {ICON_OPTIONS.map(({ value, label, Icon: Option }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  aria-label={label}
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
          <ColorSwatch color={color} label="Колір зони" onChange={pickColor} />
          <Button type="button" size="sm" variant={redrawing ? "default" : "outline"} onClick={() => redraw(redrawing ? null : marker.id)} className="h-9 gap-1.5">
            <PenLine className="size-4" />
            {redrawing ? "Малюйте нову зону…" : "Перемалювати контур"}
          </Button>
        </>
      )}
      <SwitchField label="Відома локація" title="Гравці бачать її й без відкритого туману" checked={marker.alwaysVisible} onChange={(v) => void save({ alwaysVisible: v })} />
      <Button type="button" size="sm" variant="outline" onClick={() => (marker.childMapId ? openMap(marker.childMapId) : setCreating(true))} className="h-9 gap-1.5">
        <MapPinned className="size-4" />
        {marker.childMapId ? "Відкрити вкладену карту" : "Створити вкладену карту"}
      </Button>
      <Popover onOpenChange={(o) => !o && commitNote()}>
        <PopoverTrigger asChild>
          <button type="button" className={CHIP}>
            <NotebookPen className="size-4" aria-hidden />
            Нотатка
            {note.trim() ? <span aria-hidden className="size-1.5 rounded-full bg-[var(--gold)]" /> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn(POPOVER, "w-72")}>
          <Textarea aria-label="Нотатка ДМ" rows={5} value={note} maxLength={WORLD_DM_NOTE_MAX} onChange={(e) => setNote(e.target.value)} onBlur={commitNote} />
        </PopoverContent>
      </Popover>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        <DeleteButton label="Видалити" onClick={() => void remove()} />
        <CloseButton onClose={onClose} />
      </span>
      <NewWorldMapDialog open={creating} onOpenChange={setCreating} parentMarker={{ id: marker.id, name: marker.name }} />
    </>
  );
}

function MapStrip({ detail, onClose }: { detail: WorldMapDetail; onClose(): void }) {
  const { campaignId, maps, editor, openMap, tool, setTool } = useWorldEditorContext();

  const fileInput = useRef<HTMLInputElement>(null);

  const { map, name, setName, commitName, radius, setRadius, commitRadius, fill, children, save, replaceImage, remove } = useMapFields({ campaignId, detail, maps, editor, openMap });

  return (
    <>
      <span className="flex shrink-0 items-center gap-2">
        <span className={MEDALLION}>
          <MapIcon className="size-4 text-[#2a1d05]" aria-hidden />
        </span>
        <span className="hud-sc text-xs text-hud-muted">{map.parentMapId ? "Вкладена карта" : "Коренева карта"}</span>
      </span>
      <Input
        aria-label="Назва"
        className="h-9 w-48"
        maxLength={WORLD_NAME_MAX}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <SwitchField label="Туман війни" title="Приховувати невідкриті ділянки" checked={map.fogEnabled} onChange={(v) => void save({ fogEnabled: v })} />
      <label className="flex shrink-0 items-center gap-2 text-sm">
        Радіус
        <input
          type="range"
          aria-label="Радіус огляду"
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
        {tool === "entry" ? "Клікніть по карті…" : "Точка входу: задати на карті"}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={CHIP}>
            Вкладені карти · {children.length}
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
            <p className="text-xs text-hud-muted">Оберіть маркер і створіть для нього вкладену карту.</p>
          )}
        </PopoverContent>
      </Popover>
      <Button type="button" size="sm" variant="outline" title={`${map.width}×${map.height} px`} onClick={() => fileInput.current?.click()} className="h-9 gap-1.5">
        <ImageUp className="size-4" />
        Замінити картинку
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
        <DeleteButton label="Видалити карту" onClick={() => void remove()} />
        <CloseButton onClose={onClose} />
      </span>
    </>
  );
}
