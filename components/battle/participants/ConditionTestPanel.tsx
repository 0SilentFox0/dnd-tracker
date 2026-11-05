"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { D100Input } from "@/components/battle/hud/D100Input";
import { AiRollButton } from "@/components/battle/hud/DiceInput";
import { useConditionTestPanel } from "@/lib/hooks/battle";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";

const SOURCES = ["server", "manual"] as const;

const btn = "h-9 w-full border border-white/25 px-2 text-left text-sm text-[var(--bone)] disabled:opacity-40";

export function ConditionTestPanel({ hero }: { hero: BattleParticipant }) {
  const t = useTranslations("battleWfrp.ui.test");

  const text = useText();

  const panel = useConditionTestPanel(hero);

  const [open, setOpen] = useState<string | null>(null);

  const [source, setSource] = useState<(typeof SOURCES)[number]>("server");

  if (!panel) return null;

  const run = (key: string, roll?: number) => {
    setOpen(null);
    panel.attempt(key, roll);
  };

  return (
    <div className="mt-2 space-y-1.5">
      {panel.items.map(({ key, label, stand }) => (
        <div key={key}>
          <button type="button" disabled={panel.isPending} aria-expanded={open === key} className={btn} onClick={() => (stand ? run(key) : setOpen(open === key ? null : key))}>
            {stand ? t("stand") : t("attempt", { condition: text(label) })}
          </button>
          {open === key && (
            <div className="pb-1">
              <div className="mt-2 grid h-9 grid-cols-2 border border-white/20">
                {SOURCES.map((m) => (
                  <button key={m} type="button" aria-pressed={source === m} onClick={() => setSource(m)} className={cn("border-l border-white/20 text-sm first:border-l-0", source === m ? "bg-white/10 font-bold text-[var(--ink)]" : "text-hud-soft")}>{t(m === "server" ? "auto" : "manual")}</button>
                ))}
              </div>
              {source === "manual" ? <D100Input onRoll={(roll) => run(key, roll)} /> : <div className="mt-2"><AiRollButton onClick={() => run(key)} /></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
