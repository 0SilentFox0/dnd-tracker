import { useTranslations } from "next-intl";

import { PATH_HEADER_CLASS } from "@/components/hud/page/pathHeader";

export function PointsHeader({ level, spent, free }: { level: number; spent: number; free: number }) {
  const t = useTranslations("skillTree.progression");

  return (
    <header className={PATH_HEADER_CLASS}>
      <span className="hud-sc text-base text-hud-ink">{t("title", { level })}</span>
      <span className="flex items-center gap-2 text-sm text-[#b8ab95]">
        {free > 0 && <b className="hud-sc text-[#ffd9a8]">{t("points", { count: free })}</b>}
        <span>{spent} / {level}</span>
      </span>
    </header>
  );
}
