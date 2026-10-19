"use client";

import { useEffect } from "react";

import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { MORALE_SKIP_MS } from "@/lib/utils/battle/flows";
import { signed } from "@/lib/utils/common/format";

const die = "hud-sc flex items-center justify-center font-extrabold [clip-path:polygon(50%_0,100%_38%,82%_100%,18%_100%,0_38%)] animate-[hud-dropin_.7s_cubic-bezier(.16,1,.3,1)_both]";

const cta = "hud-sc mt-8 flex h-[52px] w-full max-w-xs items-center justify-center text-[17px] font-bold tracking-[.06em]";

/** Мораль — на весь екран: вона визначає хід. Підсумки атак і заклинань — у кутовій картці (ActionResultCard). */
export function ResultOverlay() {
  const { result: { fx, show } } = useBattleScene();

  useEffect(() => {
    if (fx?.kind !== "morale-skip") return;

    const id = setTimeout(() => show(null), MORALE_SKIP_MS);

    return () => clearTimeout(id);
  }, [fx, show]);

  if (!fx) return null;

  const close = () => show(null);

  const shell = "fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-8 text-center";

  if (fx.kind === "morale-extra") {
    return (
      <div className={cn(shell, "bg-[radial-gradient(circle_at_50%_42%,rgba(232,199,122,.35)_0,rgba(10,8,6,.92)_55%)]")}>
        <div className="absolute left-1/2 top-[42%] size-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[repeating-conic-gradient(rgba(232,199,122,.16)_0_6deg,transparent_6deg_20deg)] [mask:radial-gradient(circle,#000_20%,transparent_65%)] animate-[hud-spin_8s_linear_infinite]" />
        <div className={cn(die, "relative mb-5 size-[88px] bg-[#e8c77a] text-[40px] text-[#2a1d05]")}>{fx.d10}</div>
        <div className="hud-sc relative text-[40px] font-extrabold leading-[44px] tracking-[.08em] text-[#f3dc9a] [text-shadow:0_0_24px_rgba(232,199,122,.6)] animate-[hud-rise_.7s_.25s_both]">Бойовий дух</div>
        <div className="relative mt-3 text-base animate-[hud-fade_.5s_.6s_both]">{fx.name} отримує додатковий хід наприкінці раунду</div>
        <div className="relative mt-1.5 text-sm text-[#a89c88]">d10 = {fx.d10} · мораль {signed(fx.morale)}</div>
        <button type="button" onClick={close} className={cn(cta, "relative border border-hud-gold-strong bg-[#8a6414] text-[#fff3d1]")}>До бою</button>
      </div>
    );
  }

  if (fx.kind === "morale-skip") {
    return (
      <div className={cn(shell, "bg-[rgba(6,6,8,.9)] backdrop-grayscale")} onClick={close}>
        <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 390 812" preserveAspectRatio="none" aria-hidden>
          <path d="M210 0 L190 120 L225 190 L180 300 L205 360 L170 470" fill="none" stroke="rgba(200,200,210,.35)" strokeWidth="2" className="[stroke-dasharray:400] [stroke-dashoffset:400] animate-[hud-crack_.35s_.45s_forwards]" />
        </svg>
        <div className={cn(die, "mb-5 size-[88px] bg-[#3a3a40] text-[40px] text-[#c9c9cf]")}>{fx.d10}</div>
        <div className="hud-sc text-[40px] font-extrabold tracking-[.14em] text-[#b9b9c0] animate-[hud-shake-title_.5s_.45s_both]">Паніка</div>
        <div className="mt-3 text-base">{fx.name} втрачає хід</div>
        <div className="mt-1.5 text-sm text-[#a89c88]">d10 = {fx.d10} · мораль {fx.morale}</div>
        <div className="mt-8 h-[3px] w-full max-w-xs bg-[#333]"><i className="block h-full bg-[var(--enemy)]" style={{ animation: `hud-countdown ${MORALE_SKIP_MS}ms 0s linear forwards` }} /></div>
      </div>
    );
  }

  return null;
}
