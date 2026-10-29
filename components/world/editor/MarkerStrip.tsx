"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPinned, MessagesSquare, NotebookPen, PenLine } from "lucide-react";

import { DmMarkerNotes } from "./DmMarkerNotes";
import { CHIP, CloseButton, DeleteButton, NameInput, POPOVER, StripLead, SwitchField } from "./InspectorParts";
import { ICON_OPTIONS, markerIcon } from "./marker-icon-options";
import { NewWorldMapDialog } from "./NewWorldMapDialog";
import { useWorldEditorContext } from "./WorldEditorContext";

import { ColorSwatch } from "@/components/common/ColorSwatch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { WORLD_DM_NOTE_MAX } from "@/lib/constants/world";
import { useMarkerFields } from "@/lib/hooks/world";
import { cn } from "@/lib/utils";
import type { WorldMarker } from "@/types/world";

export function MarkerStrip({ marker, onClose }: { marker: WorldMarker; onClose(): void }) {
  const { editor, select, openMap, redraw, redrawId } = useWorldEditorContext();

  const t = useTranslations("world");

  const tc = useTranslations("common.actions");

  const [creating, setCreating] = useState(false);

  const [iconOpen, setIconOpen] = useState(false);

  const { name, setName, commitName, note, setNote, commitNote, color, pickColor, save, remove } = useMarkerFields({ marker, editor, select });

  const redrawing = redrawId === marker.id;

  const Icon = markerIcon(marker);

  return (
    <>
      <StripLead icon={Icon} label={t(`shape.${marker.kind}`)} labelClassName="hidden xl:inline" />
      <NameInput value={name} onChange={setName} onCommit={commitName} />
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
        <DeleteButton label={tc("delete")} onClick={() => void remove()} />
        <CloseButton onClose={onClose} />
      </span>
      <NewWorldMapDialog open={creating} onOpenChange={setCreating} parentMarker={{ id: marker.id, name: marker.name }} />
    </>
  );
}

