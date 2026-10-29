"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { useInCornerStack } from "@/components/battle/scene/CornerStack";
import { useMapStripSlot, useNoticeStack } from "@/components/battle/scene/MapStrip";
import { HUD_SURFACE } from "@/components/hud";
import { useActionResult } from "@/lib/hooks/battle";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import type { ActionResultFx } from "@/types/battle-scene";

const TONE = { hit: "text-[#e9705a]", crit: "text-[#ffd36a]", miss: "text-[#8f8f96]" } as const;

// десктоп завжди рендерить картку в CornerStack, тож «fixed» — лише телефон до появи стеку сповіщень
const PLACEMENT = { slot: "mb-1", stack: "", corner: "w-[300px]", fixed: "fixed inset-x-4 top-14 z-50 mx-auto max-w-md" } as const;

type AttackFx = Exclude<ActionResultFx, { kind: "spell" }>;

type ResultT = ReturnType<typeof useTranslations<"battle.result">>;

const strikeText = (t: ResultT, s: { kind: "hit" | "crit" | "miss"; damage: number; downed: boolean }) =>
  s.kind === "miss" ? t("miss") : `${s.kind === "crit" ? t("critPrefix") : ""}−${s.damage}${s.downed ? ` · ${t("downed")}` : ""}`;

function AttackBody({ fx }: { fx: AttackFx }) {
  const t = useTranslations("battle.result");

  const text = useText();

  const critFail = fx.kind === "miss" ? fx.critFail : undefined;

  const effect = fx.kind === "miss" ? critFail : fx.critEffect;

  return (
    <>
      <div className={cn("hud-sc text-lg font-extrabold tracking-[.08em]", critFail ? "text-[#c0564a]" : TONE[fx.kind])}>{critFail ? t("critFail") : t(`title.${fx.kind}`)}</div>
      {fx.strikes && fx.strikes.length > 1 ? (
        <ul className="mt-1 space-y-0.5 text-sm">
          {fx.strikes.map((s, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="truncate">{s.targetName}{s.splash ? ` · ${t("splash")}` : ""}</span>
              <span className={cn("shrink-0", TONE[s.kind])}>{strikeText(t, s)}</span>
            </li>
          ))}
        </ul>
      ) : fx.kind === "miss" ? (
        <div className="mt-1 text-sm">{fx.targetName} · d20 {fx.d20} · AC {fx.known}</div>
      ) : (
        <div className="mt-1 flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate">{fx.targetName}{fx.downed ? ` · ${t("downed")}` : ""}</span>
          <span className={cn("hud-sc shrink-0 text-2xl font-extrabold", TONE[fx.kind])}>−{fx.damage}</span>
        </div>
      )}
      {effect && (
        <div className="mt-1 text-sm">
          <b className="hud-sc">{text(effect.name)}</b>
          {effect.flavor && <span className="italic text-[#a89c88]"> · {text(effect.flavor)}</span>}
        </div>
      )}
      {fx.retaliation && <div className="mt-1 text-sm text-[#e9a08f]">{t("retaliation", { name: fx.retaliation.name, outcome: fx.retaliation.damage > 0 ? `−${fx.retaliation.damage}` : t("miss") })}</div>}
    </>
  );
}

function SpellBody({ fx }: { fx: Extract<ActionResultFx, { kind: "spell" }> }) {
  const t = useTranslations("battle.result");

  return (
    <>
      <div className="hud-sc text-lg font-extrabold tracking-[.06em] text-hud-gold-bright">{fx.spellName}</div>
      {fx.changes.length > 0 ? (
        <ul className="mt-1 space-y-0.5 text-sm">
          {fx.changes.map((c) => (
            <li key={c.name} className="flex justify-between gap-3">
              <span className="truncate">{c.name}</span>
              <span className={cn("shrink-0", c.change > 0 ? "text-[#e9705a]" : "text-[#8fd18f]")}>{c.change > 0 ? `−${c.change}` : `+${-c.change}`}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-1 text-sm text-[var(--hud-muted)]">{fx.targetCount > 0 ? t("appliedTargets", { count: fx.targetCount }) : t("applied")}</div>
      )}
    </>
  );
}

/** Підсумок дії в кутку, а не поверх карти: анімація на токенах лишається видимою, клік повз картку йде на карту. */
export function ActionResultCard() {
  const t = useTranslations("battle.result");

  const tu = useTranslations("common.ui");

  const { fx, close } = useActionResult();

  const slot = useMapStripSlot();

  const stack = useNoticeStack();

  const corner = useInCornerStack();

  if (!fx) return null;

  const placement = slot ? "slot" : stack ? "stack" : corner ? "corner" : "fixed";

  const card = (
    <div
      role="status"
      aria-label={t("aria")}
      onClick={close}
      className={cn(
        HUD_SURFACE,
        "relative cursor-pointer border border-white/25 bg-[#15110e]/95 py-2 pl-3 pr-9 text-[var(--ink)] animate-[hud-fade_.2s]",
        PLACEMENT[placement],
      )}
    >
      {fx.kind === "spell" ? <SpellBody fx={fx} /> : <AttackBody fx={fx} />}
      <button type="button" aria-label={tu("close")} onClick={close} className="absolute right-1 top-1 flex size-7 items-center justify-center text-[var(--hud-muted)]">
        <X className="size-4" />
      </button>
    </div>
  );

  const target = slot ?? stack;

  return target ? createPortal(card, target) : card;
}
