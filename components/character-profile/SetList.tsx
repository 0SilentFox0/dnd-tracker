"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { SetProgress } from "@/types/characters";

export function SetList({ sets }: { sets: SetProgress[] }) {
  const t = useTranslations("characterProfile.sets");

  if (sets.length === 0) return null;

  return (
    <ul>
      {sets.map((s) => (
        <li key={s.setId} className="border-b border-[#2a2218] py-2">
          <span className={cn("block text-sm", s.complete ? "text-hud-gold-strong" : "text-hud-ink")}>
            ✦ {t("name", { name: s.name, have: s.have, total: s.total })}
          </span>
          <span className="block text-xs text-hud-muted">{s.complete ? s.effects.join(" · ") : t("withFull", { effects: s.effects.join(" · ") || "—" })}</span>
        </li>
      ))}
    </ul>
  );
}
