"use client";

import { BattleMap } from "@/components/battle/map";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { HAZARD_DICE_PATTERN } from "@/lib/constants/battle";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import type { BattleMapEditor } from "@/lib/hooks/battles";
import { cn } from "@/lib/utils";
import { clamp, isPreviewSafeBackground, marginLimit,type Margins, MAX_MARGIN, MAX_SIDE, MIN_PLAYABLE, MIN_SIDE, type SetupTool } from "@/lib/utils/battle/grid";

const MARGIN_FIELDS: { key: keyof Margins; label: string }[] = [
  { key: "top", label: "Зверху" },
  { key: "right", label: "Справа" },
  { key: "bottom", label: "Знизу" },
  { key: "left", label: "Зліва" },
];

const TOOLS: { value: SetupTool; label: string }[] = [
  { value: "blocked", label: "Неігрова" },
  { value: "wall", label: "Непрохідне" },
  { value: "hazard", label: "Небезпека" },
  { value: "erase", label: "Стерти" },
];

const DAMAGE_OPTIONS = DAMAGE_ELEMENT_OPTIONS.map(({ value, label }) => ({ value, label }));

function ToggleRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} aria-label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function BattleFormMap({ editor }: { editor: BattleMapEditor }) {
  const { enabled, map, margins, tool, notice } = editor.state;

  const { brush, actions } = editor;

  const setMargin = (key: keyof Margins, raw: number | undefined) => actions.setMargins({ ...margins, [key]: clamp(raw ?? 0, 0, marginLimit(map, margins, key)) });

  const previewMap = isPreviewSafeBackground(map.background) || map.background === null ? map : { ...map, background: null };

  const setEqual = () => {
    const cap = Math.min(MAX_MARGIN, Math.floor((map.rows - MIN_PLAYABLE) / 2), Math.floor((map.cols - MIN_PLAYABLE) / 2));

    const n = clamp(margins.top, 0, cap);

    actions.setMargins({ top: n, right: n, bottom: n, left: n });
  };

  return (
    <HudSection title="Карта бою" className="space-y-4">
      <ToggleRow id="map-enabled" label="Бій на карті" checked={enabled} onChange={actions.setEnabled} />
      {enabled && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="map-cols">Колонки</Label>
                <NumberInput id="map-cols" value={map.cols} onChange={(v) => actions.setSize(clamp(v ?? MIN_SIDE, MIN_SIDE, MAX_SIDE), map.rows)} />
              </div>
              <div>
                <Label htmlFor="map-rows">Рядки</Label>
                <NumberInput id="map-rows" value={map.rows} onChange={(v) => actions.setSize(map.cols, clamp(v ?? MIN_SIDE, MIN_SIDE, MAX_SIDE))} />
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
                onChange={(e) => actions.setOpacity(Number(e.target.value))}
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
            <div className="space-y-2">
              <Label>Малювання клітинок</Label>
              <div className="flex flex-wrap gap-1.5">
                {TOOLS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={tool === value}
                    onClick={() => actions.setTool(tool === value ? null : value)}
                    className={cn(
                      "h-8 rounded-md border bg-black/30 px-3 text-sm hover:bg-black/50",
                      tool === value ? "border-[var(--gold)] text-hud-gold-bright" : "border-hud-rule text-hud-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tool === "hazard" && (
                <div className="grid gap-2 sm:grid-cols-[1fr_8rem_10rem]">
                  <Input aria-label="Підпис небезпеки" className="self-end" maxLength={60} value={brush.label} onChange={(e) => actions.setBrush({ label: e.target.value })} />
                  <div className="space-y-1">
                    <Label htmlFor="map-hazard-dice" className="text-xs">
                      Шкода (кубики)
                    </Label>
                    <Input
                      id="map-hazard-dice"
                      aria-invalid={brush.dice.trim() !== "" && !HAZARD_DICE_PATTERN.test(brush.dice.trim())}
                      maxLength={12}
                      placeholder="без шкоди"
                      value={brush.dice}
                      onChange={(e) => actions.setBrush({ dice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="map-hazard-type" className="text-xs">
                      Тип
                    </Label>
                    <SelectField id="map-hazard-type" value={brush.damageType} onValueChange={(damageType) => actions.setBrush({ damageType })} placeholder="Тип" options={DAMAGE_OPTIONS} />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <ImageUpload value={map.background ?? ""} onChange={(v) => actions.setBackground(v || null)} label="Фон карти" maxSide={2400} allowFile />
              <Button type="button" variant="outline" size="sm" onClick={() => actions.setBackground(null)} disabled={map.background === null}>
                Стандартний фон
              </Button>
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <p aria-live="polite" role="status" className="min-h-5 text-sm text-hud-gold-bright">
              {notice}
            </p>
            <div className="h-[55vh] lg:h-[60vh]">
              <BattleMap map={previewMap} participants={[]} actions={{ onStroke: actions.onStroke }} className="h-full" editing={{ clickableBlocked: tool !== null, strokeTool: tool !== null, showBlocked: true }} />
            </div>
          </div>
        </div>
      )}
    </HudSection>
  );
}
