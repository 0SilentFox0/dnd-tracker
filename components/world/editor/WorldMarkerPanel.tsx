"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPinned, PenLine } from "lucide-react";

import { DmMarkerNotes } from "./DmMarkerNotes";
import { ICON_OPTIONS,markerIcon } from "./marker-icon-options";
import { NewWorldMapDialog } from "./NewWorldMapDialog";
import { useWorldEditorContext } from "./WorldEditorContext";
import { QuietDeleteButton, WorldPanelHeader } from "./WorldPanelHeader";

import { ColorSwatch } from "@/components/common/ColorSwatch";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WORLD_DM_NOTE_MAX, WORLD_NAME_MAX } from "@/lib/constants/world";
import { useMarkerFields } from "@/lib/hooks/world";
import { cn } from "@/lib/utils";
import type { WorldMarker } from "@/types/world";

export function WorldMarkerPanel() {
  const { detail, selectedId } = useWorldEditorContext();

  const marker = detail?.markers.find((m) => m.id === selectedId);

  return marker ? <MarkerForm key={marker.id} marker={marker} /> : null;
}

function MarkerForm({ marker }: { marker: WorldMarker }) {
  const { detail, editor, select, openMap, redraw, redrawId } = useWorldEditorContext();

  const t = useTranslations("world");

  const [creating, setCreating] = useState(false);

  const { name, setName, commitName, note, setNote, commitNote, color, pickColor, save, remove } = useMarkerFields({ marker, editor, select });

  const redrawing = redrawId === marker.id;

  const HeaderIcon = markerIcon(marker);

  return (
    <div>
      <WorldPanelHeader badge={<HeaderIcon className="size-5 text-[#2a1d05]" aria-hidden />} title={marker.name} subtitle={t("editor.markerSubtitle", { shape: t(`shape.${marker.kind}`), map: detail?.map.name ?? "" })} />
      <HudSection title={t("editor.basic")}>
        <div className="space-y-3">
          <LabeledInput label={t("name")} maxLength={WORLD_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} />
          {marker.kind === "point" ? (
            <div role="group" aria-label={t("editor.icon")} className="grid grid-cols-4 gap-1.5">
              {ICON_OPTIONS.map(({ value, Icon }) => (
                <button
                  key={value}
                  type="button"
                  title={t(`markerKinds.${value}`)}
                  aria-label={t(`markerKinds.${value}`)}
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
              <ColorSwatch color={color} label={t("editor.zoneColor")} onChange={pickColor} />
              {t("editor.zoneColor")}
            </div>
          )}
          {marker.kind === "zone" ? (
            <Button type="button" variant={redrawing ? "default" : "outline"} onClick={() => redraw(redrawing ? null : marker.id)} className="w-full gap-2">
              <PenLine className="size-4" />
              {redrawing ? t("editor.drawNewZone") : t("editor.redrawZone")}
            </Button>
          ) : null}
        </div>
      </HudSection>
      <HudSection title={t("editor.forDm")}>
        <div className="space-y-3">
          <label className="block space-y-1 text-sm">
            {t("editor.dmNote")}
            <Textarea value={note} maxLength={WORLD_DM_NOTE_MAX} onChange={(e) => setNote(e.target.value)} onBlur={commitNote} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              {t("editor.knownLocation")}
              <span className="block text-xs text-hud-muted">{t("editor.knownLocationHint")}</span>
            </span>
            <Switch checked={marker.alwaysVisible} onCheckedChange={(v) => void save({ alwaysVisible: v })} />
          </label>
        </div>
      </HudSection>
      {detail ? (
        <HudSection title={t("editor.playerNotes")}>
          <DmMarkerNotes marker={marker} />
        </HudSection>
      ) : null}
      <HudSection title={t("editor.childMap")}>
        {marker.childMapId ? (
          <Button type="button" variant="outline" onClick={() => openMap(marker.childMapId)} className="w-full gap-2">
            <MapPinned className="size-4" />
            {t("editor.openChild")}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setCreating(true)} className="w-full gap-2">
            <MapPinned className="size-4" />
            {t("editor.createChild")}
          </Button>
        )}
      </HudSection>
      <QuietDeleteButton label={t("editor.delete")} onClick={() => void remove()} />
      <NewWorldMapDialog open={creating} onOpenChange={setCreating} parentMarker={{ id: marker.id, name: marker.name }} />
    </div>
  );
}
