"use client";

import { useTranslations } from "next-intl";

export function ColorSwatch({ color, onChange, label }: { color: string; onChange: (color: string) => void; label: string }) {
  const t = useTranslations("common.color");

  return (
    <label
      title={t("pick")}
      className="relative size-9 shrink-0 cursor-pointer rounded-md border border-input focus-within:ring-2 focus-within:ring-ring"
      style={{ background: color }}
    >
      <input type="color" aria-label={label} value={color} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
    </label>
  );
}
