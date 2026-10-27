"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPinned, PenLine, Trash2 } from "lucide-react";

import { NewWorldMapDialog } from "./NewWorldMapDialog";
import { useWorldEditorContext } from "./WorldEditorContext";

import { ColorSwatch } from "@/components/common/ColorSwatch";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_ZONE_COLOR, WORLD_DM_NOTE_MAX, WORLD_MARKER_ICONS, WORLD_NAME_MAX } from "@/lib/constants/world";
import { useConfirm } from "@/lib/hooks/common";
import type { UpdateWorldMarkerData, WorldMarker } from "@/types/world";

const ICON_OPTIONS = Object.entries(WORLD_MARKER_ICONS).map(([value, { label }]) => ({ value, label }));

const COLOR_DEBOUNCE_MS = 400;

export function WorldMarkerPanel() {
  const { detail, selectedId } = useWorldEditorContext();

  const marker = detail?.markers.find((m) => m.id === selectedId);

  return marker ? <MarkerForm key={marker.id} marker={marker} /> : null;
}

function MarkerForm({ marker }: { marker: WorldMarker }) {
  const { editor, select, openMap, redraw, redrawId } = useWorldEditorContext();

  const confirm = useConfirm();

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

  const remove = async () => {
    const ok = await confirm({
      title: `Видалити «${marker.name}»?`,
      description: marker.childMapId ? "Разом із маркером буде видалено прив'язану карту та всі вкладені карти з їхніми маркерами й картинками." : "Маркер буде видалено.",
      confirmLabel: "Видалити",
      destructive: true,
    });

    if (ok && (await editor.marker.remove.mutateOk(marker.id))) select(null);
  };

  const redrawing = redrawId === marker.id;

  return (
    <div className="space-y-4">
      <LabeledInput label="Назва" maxLength={WORLD_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} />
      {marker.kind === "point" ? (
        <SelectField aria-label="Іконка" value={marker.icon ?? ""} onValueChange={(icon) => void save({ icon })} options={ICON_OPTIONS} placeholder="Іконка" />
      ) : (
        <div className="flex items-center gap-3 text-sm">
          <ColorSwatch color={color} label="Колір зони" onChange={pickColor} />
          Колір зони
        </div>
      )}
      <label className="block space-y-1 text-sm">
        Нотатка ДМ
        <Textarea value={note} maxLength={WORLD_DM_NOTE_MAX} onChange={(e) => setNote(e.target.value)} onBlur={commitNote} />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        Відома локація
        <Switch checked={marker.alwaysVisible} onCheckedChange={(v) => void save({ alwaysVisible: v })} />
      </label>
      <div className="flex flex-col gap-2">
        {marker.kind === "zone" ? (
          <Button type="button" variant={redrawing ? "default" : "outline"} onClick={() => redraw(redrawing ? null : marker.id)} className="gap-2">
            <PenLine className="size-4" />
            {redrawing ? "Малюйте нову зону…" : "Перемалювати зону"}
          </Button>
        ) : null}
        {marker.childMapId ? (
          <Button type="button" variant="outline" onClick={() => openMap(marker.childMapId)} className="gap-2">
            <MapPinned className="size-4" />
            Відкрити вкладену карту
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setCreating(true)} className="gap-2">
            <MapPinned className="size-4" />
            Створити вкладену карту
          </Button>
        )}
        <Button type="button" variant="destructive" onClick={() => void remove()} className="gap-2">
          <Trash2 className="size-4" />
          Видалити
        </Button>
      </div>
      <NewWorldMapDialog open={creating} onOpenChange={setCreating} parentMarker={{ id: marker.id, name: marker.name }} />
    </div>
  );
}
