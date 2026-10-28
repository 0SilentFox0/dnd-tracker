"use client";

import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";

import { HudPanel } from "@/components/hud/page";

export function WorldSidePanel({ open, onClose, children }: { open: boolean; onClose(): void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <aside aria-label="Панель редактора" className="absolute inset-y-2 right-2 z-20 w-80 max-w-[calc(100%-1rem)]">
      <HudPanel className="h-full overflow-y-auto bg-[rgba(17,14,11,.97)] shadow-xl">
        <button type="button" aria-label="Закрити панель" onClick={onClose} className="absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-md border border-hud-rule text-hud-muted hover:bg-white/10 hover:text-hud-ink">
          <X className="size-4" aria-hidden />
        </button>
        {children}
      </HudPanel>
    </aside>
  );
}
