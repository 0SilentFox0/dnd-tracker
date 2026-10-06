"use client";

import { useEffect } from "react";

import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { MORALE_SKIP_MS } from "@/lib/utils/battle/flows";
import { signed } from "@/lib/utils/format";

const die = "hud-sc flex items-center justify-center font-extrabold [clip-path:polygon(50%_0,100%_38%,82%_100%,18%_100%,0_38%)] animate-[hud-dropin_.7s_cubic-bezier(.16,1,.3,1)_both]";

const cta = "hud-sc mt-8 flex h-[52px] w-full max-w-xs items-center justify-center text-[17px] font-bold tracking-[.06em]";

export function ResultOverlay() {
  const { result, showResult } = useBattleScene();

  useEffect(() => {
    if (result?.kind !== "morale-skip") return;

    const id = setTimeout(() => showResult(null), MORALE_SKIP_MS);

    return () => clearTimeout(id);
  }, [result, showResult]);

  if (!result) return null;

  const close = () => showResult(null);

  const shell = "fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-8 text-center";

  if (result.kind === "morale-extra") {
    return (
      <div className={cn(shell, "bg-[radial-gradient(circle_at_50%_42%,rgba(232,199,122,.35)_0,rgba(10,8,6,.92)_55%)]")}>
        <div className="absolute left-1/2 top-[42%] size-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[repeating-conic-gradient(rgba(232,199,122,.16)_0_6deg,transparent_6deg_20deg)] [mask:radial-gradient(circle,#000_20%,transparent_65%)] animate-[hud-spin_8s_linear_infinite]" />
        <div className={cn(die, "relative mb-5 size-[88px] bg-[#e8c77a] text-[40px] text-[#2a1d05]")}>{result.d10}</div>
        <div className="hud-sc relative text-[40px] font-extrabold leading-[44px] tracking-[.08em] text-[#f3dc9a] [text-shadow:0_0_24px_rgba(232,199,122,.6)] animate-[hud-rise_.7s_.25s_both]">Бойовий дух</div>
        <div className="relative mt-3 text-base animate-[hud-fade_.5s_.6s_both]">{result.name} отримує додатковий хід наприкінці раунду</div>
        <div className="relative mt-1.5 text-sm text-[#a89c88]">d10 = {result.d10} · мораль {signed(result.morale)}</div>
        <button type="button" onClick={close} className={cn(cta, "relative border border-[#e6c25a] bg-[#8a6414] text-[#fff3d1]")}>До бою</button>
      </div>
    );
  }

  if (result.kind === "morale-skip") {
    return (
      <div className={cn(shell, "bg-[rgba(6,6,8,.9)] backdrop-grayscale")} onClick={close}>
        <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 390 812" preserveAspectRatio="none" aria-hidden>
          <path d="M210 0 L190 120 L225 190 L180 300 L205 360 L170 470" fill="none" stroke="rgba(200,200,210,.35)" strokeWidth="2" className="[stroke-dasharray:400] [stroke-dashoffset:400] animate-[hud-crack_.35s_.45s_forwards]" />
        </svg>
        <div className={cn(die, "mb-5 size-[88px] bg-[#3a3a40] text-[40px] text-[#c9c9cf]")}>{result.d10}</div>
        <div className="hud-sc text-[40px] font-extrabold tracking-[.14em] text-[#b9b9c0] animate-[hud-shake-title_.5s_.45s_both]">Паніка</div>
        <div className="mt-3 text-base">{result.name} втрачає хід</div>
        <div className="mt-1.5 text-sm text-[#a89c88]">d10 = {result.d10} · мораль {result.morale}</div>
        <div className="mt-8 h-[3px] w-full max-w-xs bg-[#333]"><i className="block h-full bg-[var(--enemy)]" style={{ animation: `hud-countdown ${MORALE_SKIP_MS}ms 0s linear forwards` }} /></div>
      </div>
    );
  }

  if (result.kind === "miss") {
    return (
      <div className={cn(shell, "bg-[rgba(8,8,10,.86)]")}>
        <div className="relative mb-6 h-10 w-56" aria-hidden>
          {[180, 220, 150].map((w, i) => <i key={i} className="absolute left-0 h-0.5 rounded bg-gradient-to-r from-transparent to-[#9a9aa2] animate-[hud-whoosh_.45s_ease-out_both]" style={{ top: 8 + i * 12, width: w, animationDelay: `${i * 60}ms` }} />)}
        </div>
        <div className="hud-sc text-[40px] font-extrabold tracking-[.2em] text-[#8f8f96]">Промах</div>
        <div className="mt-3 text-base">повз {result.targetName}</div>
        <div className="mt-1.5 text-sm text-[#a89c88]">ваш результат {result.d20} · тепер відомо: AC {result.known}</div>
        <button type="button" onClick={close} className={cn(cta, "border border-[#555] text-[#c9c9cf]")}>Далі</button>
      </div>
    );
  }

  if (result.kind !== "hit" && result.kind !== "crit") return null;

  const crit = result.kind === "crit";

  return (
    <div className={cn(shell, crit ? "bg-[radial-gradient(circle_at_50%_40%,rgba(192,57,43,.45),rgba(8,6,5,.94)_60%)]" : "bg-[radial-gradient(circle_at_50%_42%,rgba(156,42,29,.32),rgba(8,6,5,.93)_58%)]")}>
      <div className={cn("absolute left-[-10%] right-[-10%] top-[40%] animate-[hud-slash_.3s_ease-out_both]", crit ? "h-1.5 rotate-[-24deg] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_24px_#ff9a6a]" : "h-[3px] rotate-[-18deg] bg-gradient-to-r from-transparent via-[#e6dccb] to-transparent opacity-80")} />
      <div className={cn("hud-sc relative font-extrabold tracking-[.12em] animate-[hud-rise_.5s_.35s_both]", crit ? "text-[34px] leading-10 text-[#ffd9a8]" : "text-[34px] text-[var(--ink)]")}>{crit ? "Критичне влучання" : "Влучання"}</div>
      <div className={cn("hud-sc relative mt-4 font-extrabold animate-[hud-pop_.45s_.65s_cubic-bezier(.16,1,.3,1)_both]", crit ? "text-[64px] text-[#ff6a4d] [text-shadow:0_0_30px_rgba(255,90,60,.7)]" : "text-[52px] text-[#e9705a]")}>−{result.damage}</div>
      <div className="relative mt-3 text-[15px] text-[#d9cfbd]">{result.targetName}{result.downed ? " · повалений" : ""}</div>
      <div className="relative mt-1.5 text-sm text-[#a89c88]">d20 = {result.d20}{result.weapon ? ` · ${result.weapon}` : ""}</div>
      <button type="button" onClick={close} className={cn(cta, "relative border border-[#a8473a] bg-[#7a2a1f] text-[#f3e7cc]")}>Деталі шкоди</button>
    </div>
  );
}
