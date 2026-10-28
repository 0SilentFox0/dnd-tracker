"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import type { Toast } from "@/lib/hooks/common";

export function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const t = useTranslations("common");

  if (!toasts.length) return null;

  return (
    <div role="status" aria-live="polite" aria-label={t("notifications.region")} className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-80">
      {toasts.map((toast) => (
        <div key={toast.id} className="hud-surface pointer-events-auto flex items-center gap-3 rounded-lg bg-[rgba(20,16,12,.95)] p-3 shadow-[inset_0_0_0_1px_rgba(230,194,90,.45),0_6px_20px_rgba(0,0,0,.5)]">
          {toast.icon && <span className="shrink-0 text-hud-gold">{toast.icon}</span>}
          <span className="min-w-0 flex-1 text-sm text-hud-ink">{toast.text}</span>
          {toast.href && (
            <Link href={toast.href} onClick={() => onDismiss(toast.id)} className="shrink-0 text-sm text-hud-gold underline">
              {t("notifications.open")}
            </Link>
          )}
          <button type="button" aria-label={t("ui.close")} onClick={() => onDismiss(toast.id)} className="shrink-0 text-hud-muted hover:text-hud-ink">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
