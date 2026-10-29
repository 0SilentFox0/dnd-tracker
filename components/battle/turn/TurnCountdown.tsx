"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useTranslations } from "next-intl";

export function TurnCountdown({ seconds, onElapsed, onStay }: { seconds: number; onElapsed: () => void; onStay: () => void }) {
  const t = useTranslations("battle.countdown");

  const [left, setLeft] = useState(seconds);

  const elapse = useEffectEvent(onElapsed);

  useEffect(() => {
    const started = Date.now();

    const id = setInterval(() => {
      const remaining = seconds - Math.floor((Date.now() - started) / 1_000);

      setLeft(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(id);
        elapse();
      }
    }, 250);

    return () => clearInterval(id);
  }, [seconds]);

  return (
    <div className="relative mt-2 flex h-[52px] items-center gap-3 overflow-hidden border border-[var(--enemy)] bg-[var(--enemy)]/20 px-3.5">
      <span className="flex-1 text-[15px] text-[var(--ink)]">{t.rich("endsIn", { left, b: (chunks) => <b>{chunks}</b> })}</span>
      <button type="button" onClick={onStay} className="hud-sc h-9 border border-white/40 px-3.5 text-[15px] font-bold text-[var(--ink)]">{t("stay")}</button>
      <i className="absolute bottom-0 left-0 h-[3px] bg-[#c0392b]" style={{ animation: `hud-countdown ${seconds}s linear forwards` }} />
    </div>
  );
}
