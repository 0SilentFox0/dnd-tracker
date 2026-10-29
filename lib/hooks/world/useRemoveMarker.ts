"use client";

import { useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";

import type { useWorldEditor } from "./useWorldEditor";

import { useConfirm } from "@/lib/hooks/common";
import type { WorldMarker } from "@/types/world";

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

interface Options {
  marker: WorldMarker | undefined;
  editor: ReturnType<typeof useWorldEditor>;
  select(id: string | null): void;
  /** Delete/Backspace removes the marker only while true */
  hotkey?: boolean;
}

export function useRemoveMarker({ marker, editor, select, hotkey = false }: Options) {
  const confirm = useConfirm();

  const t = useTranslations("world.removeMarker");

  const remove = useCallback(async () => {
    if (!marker) return;

    const ok = await confirm({
      title: t("title", { name: marker.name }),
      description: marker.childMapId ? t("descriptionChild") : t("descriptionPlain"),
      confirmLabel: t("confirm"),
      destructive: true,
    });

    if (ok && (await editor.marker.remove.mutateOk(marker.id))) select(null);
  }, [marker, confirm, editor, select, t]);

  useEffect(() => {
    if (!hotkey || !marker) return;

    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "Delete" && e.key !== "Backspace") || e.repeat || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.target instanceof Element && e.target.closest("[role=dialog]")) return;

      void remove();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey, marker, remove]);

  return remove;
}
