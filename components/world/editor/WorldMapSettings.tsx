"use client";

import { useRef, useState } from "react";
import { Crosshair, ImageUp, Trash2 } from "lucide-react";

import { useWorldEditorContext } from "./WorldEditorContext";

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

  const { upload } = useWorldMapUpload(campaignId);

  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(detail?.map.name ?? "");

  const [radius, setRadius] = useState(detail?.map.revealRadius ?? REVEAL_RADIUS_RANGE.min);

  if (!detail) return null;

  const { map } = detail;

  const save = (data: Parameters<typeof editor.map.update.mutateOk>[0]["data"]) => editor.map.update.mutateOk({ id: map.id, data });

  const commitName = () => {
    const next = name.trim();

    if (!next) setName(map.name);
    else if (next !== map.name) void save({ name: next });
  };

  const commitRadius = () => {
    if (radius !== map.revealRadius) void save({ revealRadius: radius });
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

    try {
      await save({ ...(await upload(file)) });
    } catch (err) {
      void notify(errorMessage(err, "Не вдалося завантажити картинку"));
    }
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
    <div className="space-y-4">
      <LabeledInput label="Назва" maxLength={WORLD_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName} />
      <label className="flex items-center justify-between gap-3 text-sm">
        Туман війни
        <Switch checked={map.fogEnabled} onCheckedChange={(v) => void save({ fogEnabled: v })} />
      </label>
      <label className="block space-y-1 text-sm">
        Радіус огляду: {Math.round(radius * 100)}%
        <input
          type="range"
          min={REVEAL_RADIUS_RANGE.min}
          max={REVEAL_RADIUS_RANGE.max}
          step={RADIUS_STEP}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          onPointerUp={commitRadius}
          onKeyUp={commitRadius}
          onBlur={commitRadius}
          className="w-full accent-[var(--gold)]"
        />
      </label>
      <div className="flex flex-col gap-2">
        <Button type="button" variant={tool === "entry" ? "default" : "outline"} onClick={() => setTool(tool === "entry" ? "select" : "entry")} className="gap-2">
          <Crosshair className="size-4" />
          {tool === "entry" ? "Клікніть по карті…" : "Поставити точку входу"}
        </Button>
        <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} className="gap-2">
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
        <Button type="button" variant="destructive" onClick={() => void remove()} className="gap-2">
          <Trash2 className="size-4" />
          Видалити карту
        </Button>
      </div>
    </div>
  );
}
