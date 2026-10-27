"use client";

import { type CSSProperties, useRef, useState } from "react";
import { ChevronRight, Crosshair, ImageUp, Map as MapIcon } from "lucide-react";

import { useWorldEditorContext } from "./WorldEditorContext";
import { QuietDeleteButton, WorldPanelHeader } from "./WorldPanelHeader";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Switch } from "@/components/ui/switch";
import { REVEAL_RADIUS_RANGE, WORLD_NAME_MAX } from "@/lib/constants/world";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { useWorldMapUpload } from "@/lib/hooks/world";
import { errorMessage } from "@/lib/utils/common/error-message";
import { subtreeMapIds } from "@/lib/utils/world/tree";

const ASPECT_TOLERANCE = 0.01;

const RADIUS_STEP = 0.005;

export function WorldMapSettings() {
  const { campaignId, detail, maps, editor, openMap, tool, setTool } = useWorldEditorContext();

  const confirm = useConfirm();

  const notify = useNotify();

  const { upload, discard } = useWorldMapUpload(campaignId);

  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(detail?.map.name ?? "");

  const [radius, setRadius] = useState(detail?.map.revealRadius ?? REVEAL_RADIUS_RANGE.min);

  const lastRadius = useRef(detail?.map.revealRadius ?? REVEAL_RADIUS_RANGE.min);

  if (!detail) return null;

  const { map } = detail;

  const children = maps.filter((m) => m.parentMapId === map.id);

  const fill = ((radius - REVEAL_RADIUS_RANGE.min) / (REVEAL_RADIUS_RANGE.max - REVEAL_RADIUS_RANGE.min)) * 100;

  const save = (data: Parameters<typeof editor.map.update.mutateOk>[0]["data"]) => editor.map.update.mutateOk({ id: map.id, data });

  const commitName = () => {
    const next = name.trim();

    if (!next) setName(map.name);
    else if (next !== map.name) void save({ name: next });
  };

  const commitRadius = () => {
    if (radius === lastRadius.current) return;

    lastRadius.current = radius;
    void save({ revealRadius: radius });
  };

  const replaceImage = async (file: File) => {
    const bitmap = await createImageBitmap(file).catch(() => null);

    const changed = bitmap ? Math.abs(bitmap.width / bitmap.height - map.width / map.height) > ASPECT_TOLERANCE : false;

    bitmap?.close();

    const ok = await confirm({
      title: "Замінити картинку?",
      description: changed ? "Пропорції нової картинки відрізняються — маркери та зони можуть зсунутися." : "Маркери й зони залишаться на своїх місцях.",
      confirmLabel: "Замінити",
    });

    if (!ok) return;

    let image;

    try {
      image = await upload(file);
    } catch (err) {
      void notify(errorMessage(err, "Не вдалося завантажити картинку"));

      return;
    }

    if (!(await save({ ...image }))) void discard(image.imageUrl);
  };

  const remove = async () => {
    const nested = subtreeMapIds(maps, map.id).length - 1;

    const ok = await confirm({
      title: `Видалити карту «${map.name}»?`,
      description: nested > 0 ? `Разом із нею буде видалено ${nested} вкладених карт, їхні маркери та картинки.` : "Маркери й картинка карти будуть видалені.",
      confirmLabel: "Видалити",
      destructive: true,
    });

    if (ok && (await editor.map.remove.mutateOk(map.id))) openMap(map.parentMapId);
  };

  return (
    <div>
      <WorldPanelHeader badge={<MapIcon className="size-5 text-[#2a1d05]" aria-hidden />} title={map.name} subtitle={map.parentMapId ? "Вкладена карта" : "Коренева карта"} />
      <HudSection title="Основне">
        <LabeledInput label="Назва" maxLength={WORLD_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} />
      </HudSection>
      <HudSection title="Туман війни">
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-3 text-sm">
            Приховувати невідкриті ділянки
            <Switch checked={map.fogEnabled} onCheckedChange={(v) => void save({ fogEnabled: v })} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="flex items-center justify-between">
              Радіус огляду
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
      <HudSection title="Точка входу">
        <Button type="button" variant={tool === "entry" ? "default" : "outline"} onClick={() => setTool(tool === "entry" ? "select" : "entry")} className="w-full gap-2">
          <Crosshair className="size-4" />
          {tool === "entry" ? "Клікніть по карті…" : "Поставити точку входу"}
        </Button>
      </HudSection>
      <HudSection title={`Вкладені карти · ${children.length}`}>
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
          <p className="text-xs text-hud-muted">Оберіть маркер і створіть для нього вкладену карту.</p>
        )}
      </HudSection>
      <HudSection title="Картинка">
        <p className="mb-2 text-xs text-hud-muted">
          {map.width}×{map.height} px
        </p>
        <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} className="w-full gap-2">
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
      </HudSection>
      <QuietDeleteButton label="Видалити карту" onClick={() => void remove()} />
    </div>
  );
}
