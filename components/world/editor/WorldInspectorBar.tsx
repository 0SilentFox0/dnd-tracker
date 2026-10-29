"use client";

import { type ReactNode, useEffect } from "react";
import { useTranslations } from "next-intl";

import { ROW } from "./InspectorParts";
import { MapStrip } from "./MapStrip";
import { MarkerStrip } from "./MarkerStrip";
import { useWorldEditorContext } from "./WorldEditorContext";

import { HudPortalClassProvider } from "@/components/ui/portal-class";
import { cn } from "@/lib/utils";

export function WorldInspectorBar({ open, onClose }: { open: boolean; onClose(): void }) {
  const { detail, selectedId } = useWorldEditorContext();

  const t = useTranslations("world.editor");

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;

      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

      onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const marker = selectedId ? detail?.markers.find((m) => m.id === selectedId) : undefined;

  let content: ReactNode;

  if (!open || !detail) content = <p className="px-1 text-xs text-hud-muted">{t("inspectorEmpty")}</p>;
  else if (marker) content = <MarkerStrip key={marker.id} marker={marker} onClose={onClose} />;
  else content = <MapStrip key={detail.map.id} detail={detail} onClose={onClose} />;

  return (
    <HudPortalClassProvider value="hud-surface">
      <div role="region" aria-label={t("inspector")} className={cn(ROW, "border-t border-hud-rule", !open && "text-hud-muted")}>
        {content}
      </div>
    </HudPortalClassProvider>
  );
}
