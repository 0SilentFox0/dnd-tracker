"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import "./level-up.css";
import { HUD_SURFACE } from "@/components/hud";
import { Button } from "@/components/ui/button";
import { useLevelUpCelebration } from "@/lib/hooks/skills";

export function LevelUpOverlay({ campaignId, characterId, name }: { campaignId: string; characterId: string; name: string }) {
  const t = useTranslations("skillTree");

  const { celebration, dismiss } = useLevelUpCelebration(campaignId, characterId);

  if (!celebration || typeof document === "undefined") return null;

  const toPanel = () => {
    dismiss();
    document.getElementById("progression")?.scrollIntoView({ behavior: "smooth" });
  };

  return createPortal(
    <div role="dialog" aria-label={t("levelUp.dialog")} onClick={dismiss} className={`${HUD_SURFACE} level-up fixed inset-0 z-[100] flex flex-col items-center justify-center`}>
      <div className="lu-title hud-sc">{t("levelUp.title")}</div>
      <div className="lu-name">{name}</div>
      <div className="lu-num">
        <div className="lu-rays" />
        <div className="lu-glow" />
        {[[-120, -90], [130, -70], [-90, 110], [100, 120], [0, -150], [-150, 10], [155, 20], [40, 150]].map(([x, y], i) => <i key={i} className="lu-spark" style={{ "--x": `${x}px`, "--y": `${y}px` } as React.CSSProperties} />)}
        <span className="lu-old hud-sc">{celebration.from}</span>
        <span className="lu-new hud-sc">{celebration.to}</span>
      </div>
      {celebration.free > 0 && (
        <div className="lu-info">
          <b className="hud-sc">{t("progression.points", { count: celebration.free })}</b>
          <p>{t("levelUp.canLearn")}</p>
        </div>
      )}
      <Button type="button" variant="ghost" className="lu-cta hud-sc metal-gold metal-fill h-auto whitespace-normal rounded-none p-0 font-normal hover:bg-transparent dark:hover:bg-transparent" onClick={(e) => { e.stopPropagation(); toPanel(); }}>{t("levelUp.cta")}</Button>
      <div className="lu-skip">{t("levelUp.dismiss")}</div>
    </div>,
    document.body,
  );
}
