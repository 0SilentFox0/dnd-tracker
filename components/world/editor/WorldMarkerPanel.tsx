"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, MapPinned, PenLine,Pentagon } from "lucide-react";

import { NewWorldMapDialog } from "./NewWorldMapDialog";
import { useWorldEditorContext } from "./WorldEditorContext";
import { QuietDeleteButton, WorldPanelHeader } from "./WorldPanelHeader";

import { ColorSwatch } from "@/components/common/ColorSwatch";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MARKER_ICON } from "@/components/world/marker-icons";
import { DEFAULT_ZONE_COLOR, WORLD_DM_NOTE_MAX, WORLD_MARKER_ICONS, WORLD_NAME_MAX } from "@/lib/constants/world";
import { useRemoveMarker } from "@/lib/hooks/world";
import { cn } from "@/lib/utils";
import type { UpdateWorldMarkerData, WorldMarker } from "@/types/world";

const ICON_OPTIONS = Object.entries(WORLD_MARKER_ICONS).map(([value, { label }]) => ({ value, label, Icon: MARKER_ICON[value] ?? MapPin }));

const COLOR_DEBOUNCE_MS = 400;

export function WorldMarkerPanel() {
  const { detail, selectedId } = useWorldEditorContext();

  const marker = detail?.markers.find((m) => m.id === selectedId);

  return marker ? <MarkerForm key={marker.id} marker={marker} /> : null;
}

function MarkerForm({ marker }: { marker: WorldMarker }) {
  const { detail, editor, select, openMap, redraw, redrawId } = useWorldEditorContext();

  const [name, setName] = useState(marker.name);

  const [note, setNote] = useState(marker.dmNote ?? "");

  const [color, setColor] = useState(marker.color ?? DEFAULT_ZONE_COLOR);

  const [creating, setCreating] = useState(false);

  const colorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = (data: UpdateWorldMarkerData) => editor.marker.update.mutateOk({ id: marker.id, data });

  const pendingColor = useRef<string | null>(null);

  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  const flushColor = useCallback(() => {
    clearTimeout(colorTimer.current);

    if (pendingColor.current === null) return;

    const color = pendingColor.current;

    pendingColor.current = null;
    void saveRef.current({ color });
  }, []);

  useEffect(() => flushColor, [flushColor]);

  const commitName = () => {
    const next = name.trim();

    if (!next) setName(marker.name);
    else if (next !== marker.name) void save({ name: next });
  };

  const commitNote = () => {
    const next = note.trim();

    if (next !== (marker.dmNote ?? "")) void save({ dmNote: next || null });
  };

  const pickColor = (c: string) => {
    setColor(c);
    clearTimeout(colorTimer.current);
    pendingColor.current = c;
    colorTimer.current = setTimeout(flushColor, COLOR_DEBOUNCE_MS);
  };

  const remove = useRemoveMarker({ marker, editor, select });

  const redrawing = redrawId === marker.id;

  const HeaderIcon = (marker.icon && MARKER_ICON[marker.icon]) || (marker.kind === "zone" ? Pentagon : MapPin);

  return (
    <div>
      <WorldPanelHeader badge={<HeaderIcon className="size-5 text-[#2a1d05]" aria-hidden />} title={marker.name} subtitle={`${marker.kind === "zone" ? "Зона" : "Точка"} · ${detail?.map.name ?? ""}`} />
      <HudSection title="Основне">
        <div className="space-y-3">
          <LabeledInput label="Назва" maxLength={WORLD_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} />
          {marker.kind === "point" ? (
            <div role="group" aria-label="Іконка" className="grid grid-cols-4 gap-1.5">
              {ICON_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={marker.icon === value}
                  onClick={() => void save({ icon: value })}
                  className={cn("flex h-11 items-center justify-center rounded-md border bg-black/40 text-hud-muted hover:text-hud-ink", marker.icon === value ? "metal-gold metal-fill border-[var(--gold)]" : "border-hud-rule")}
                >
                  <Icon className="size-5" aria-hidden />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <ColorSwatch color={color} label="Колір зони" onChange={pickColor} />
              Колір зони
            </div>
          )}
          {marker.kind === "zone" ? (
            <Button type="button" variant={redrawing ? "default" : "outline"} onClick={() => redraw(redrawing ? null : marker.id)} className="w-full gap-2">
              <PenLine className="size-4" />
              {redrawing ? "Малюйте нову зону…" : "Перемалювати зону"}
            </Button>
          ) : null}
        </div>
      </HudSection>
      <HudSection title="Для майстра">
        <div className="space-y-3">
          <label className="block space-y-1 text-sm">
            Нотатка ДМ
            <Textarea value={note} maxLength={WORLD_DM_NOTE_MAX} onChange={(e) => setNote(e.target.value)} onBlur={commitNote} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Відома локація
              <span className="block text-xs text-hud-muted">Гравці бачать її й без відкритого туману</span>
            </span>
            <Switch checked={marker.alwaysVisible} onCheckedChange={(v) => void save({ alwaysVisible: v })} />
          </label>
        </div>
      </HudSection>
      <HudSection title="Вкладена карта">
        {marker.childMapId ? (
          <Button type="button" variant="outline" onClick={() => openMap(marker.childMapId)} className="w-full gap-2">
            <MapPinned className="size-4" />
            Відкрити вкладену карту
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setCreating(true)} className="w-full gap-2">
            <MapPinned className="size-4" />
            Створити вкладену карту
          </Button>
        )}
      </HudSection>
      <QuietDeleteButton label="Видалити" onClick={() => void remove()} />
      <NewWorldMapDialog open={creating} onOpenChange={setCreating} parentMarker={{ id: marker.id, name: marker.name }} />
    </div>
  );
}
