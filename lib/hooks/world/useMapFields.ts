"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { useWorldEditor } from "./useWorldEditor";
import { useWorldMapUpload } from "./useWorldMapUpload";

import { REVEAL_RADIUS_RANGE } from "@/lib/constants/world";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";
import { subtreeMapIds } from "@/lib/utils/world/tree";
import type { WorldMapDetail, WorldMapSummary } from "@/types/world";

const ASPECT_TOLERANCE = 0.01;

interface Options {
  campaignId: string;
  detail: WorldMapDetail;
  maps: WorldMapSummary[];
  editor: ReturnType<typeof useWorldEditor>;
  openMap(id: string | null): void;
}

export function useMapFields({ campaignId, detail, maps, editor, openMap }: Options) {
  const { map } = detail;

  const confirm = useConfirm();

  const t = useTranslations("world");

  const notify = useNotify();

  const { upload, discard } = useWorldMapUpload(campaignId);

  const [name, setName] = useState(map.name);

  const [radius, setRadius] = useState(map.revealRadius);

  const lastRadius = useRef(map.revealRadius);

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
      title: t("replace.title"),
      description: changed ? t("replace.aspectChanged") : t("replace.same"),
      confirmLabel: t("replace.confirm"),
    });

    if (!ok) return;

    let image;

    try {
      image = await upload(file);
    } catch (err) {
      void notify(errorMessage(err, t("errors.uploadFailed")));

      return;
    }

    if (!(await save({ ...image }))) void discard(image.imageUrl);
  };

  const remove = async () => {
    const nested = subtreeMapIds(maps, map.id).length - 1;

    const ok = await confirm({
      title: t("removeMap.title", { name: map.name }),
      description: t("removeMap.description", { nested }),
      confirmLabel: t("removeMap.confirm"),
      destructive: true,
    });

    if (ok && (await editor.map.remove.mutateOk(map.id))) openMap(map.parentMapId);
  };

  return { map, name, setName, commitName, radius, setRadius, commitRadius, fill, children, save, replaceImage, remove };
}
