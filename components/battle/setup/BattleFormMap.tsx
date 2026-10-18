"use client";

import { BattleMap } from "@/components/battle/map";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import type { BattleMapEditor } from "@/lib/hooks/battles/setup/useBattleMapEditor";
import { clamp, isPreviewSafeBackground, marginLimit,type Margins, MAX_MARGIN, MAX_SIDE, MIN_PLAYABLE, MIN_SIDE } from "@/lib/utils/battle/grid";

const MARGIN_FIELDS: { key: keyof Margins; label: string }[] = [
  { key: "top", label: "Зверху" },
  { key: "right", label: "Справа" },
  { key: "bottom", label: "Знизу" },
  { key: "left", label: "Зліва" },
];

function ToggleRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} aria-label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function BattleFormMap({ editor }: { editor: BattleMapEditor }) {
  const { enabled, map, margins } = editor;

  const setMargin = (key: keyof Margins, raw: number | undefined) => editor.setMargins({ ...margins, [key]: clamp(raw ?? 0, 0, marginLimit(map, margins, key)) });

  const previewMap = isPreviewSafeBackground(map.background) || map.background === null ? map : { ...map, background: null };

  const setEqual = () => {
    const cap = Math.min(MAX_MARGIN, Math.floor((map.rows - MIN_PLAYABLE) / 2), Math.floor((map.cols - MIN_PLAYABLE) / 2));

    const n = clamp(margins.top, 0, cap);

    editor.setMargins({ top: n, right: n, bottom: n, left: n });
  };

  return (
    <HudSection title="Карта бою" className="space-y-4">
      <ToggleRow id="map-enabled" label="Бій на карті" checked={enabled} onChange={editor.setEnabled} />
      {enabled && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="map-cols">Колонки</Label>
                <NumberInput id="map-cols" value={map.cols} onChange={(v) => editor.setSize(clamp(v ?? MIN_SIDE, MIN_SIDE, MAX_SIDE), map.rows)} />
              </div>
              <div>
                <Label htmlFor="map-rows">Рядки</Label>
                <NumberInput id="map-rows" value={map.rows} onChange={(v) => editor.setSize(map.cols, clamp(v ?? MIN_SIDE, MIN_SIDE, MAX_SIDE))} />
              </div>
            </div>
            <div>
              <Label htmlFor="map-opacity">Прозорість сітки · {Math.round(map.opacity * 100)}%</Label>
              <input
                id="map-opacity"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={map.opacity}
                onChange={(e) => editor.setOpacity(Number(e.target.value))}
                className="w-full accent-[var(--hud-gold,#f2c14e)]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Поля (неігрові клітинки)</Label>
                <Button type="button" variant="outline" size="sm" onClick={setEqual}>
                  Однакові
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {MARGIN_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <Label htmlFor={`map-margin-${key}`} className="text-xs">
                      {label}
                    </Label>
                    <NumberInput id={`map-margin-${key}`} value={margins[key]} onChange={(v) => setMargin(key, v)} />
                  </div>
                ))}
              </div>
            </div>
            <ToggleRow id="map-paint" label="Малювати неігрові клітинки" checked={editor.paint} onChange={editor.setPaint} />
            <div className="space-y-2">
              <ImageUpload value={map.background ?? ""} onChange={(v) => editor.setBackground(v || null)} label="Фон карти" maxSide={2400} allowFile />
              <Button type="button" variant="outline" size="sm" onClick={() => editor.setBackground(null)} disabled={map.background === null}>
                Стандартний фон
              </Button>
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <p aria-live="polite" role="status" className="min-h-5 text-sm text-hud-gold-bright">
              {editor.notice}
            </p>
            <div className="h-[55vh] lg:h-[60vh]">
              <BattleMap map={previewMap} participants={[]} actions={{ onCellClick: editor.onCellClick }} className="h-full" clickableBlocked={editor.paint} showBlocked />
            </div>
          </div>
        </div>
      )}
    </HudSection>
  );
}
