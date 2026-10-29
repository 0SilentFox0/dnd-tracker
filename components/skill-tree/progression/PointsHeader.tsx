import { useTranslations } from "next-intl";

export function PointsHeader({ level, spent, free }: { level: number; spent: number; free: number }) {
  const t = useTranslations("skillTree.progression");

  return (
    <header className="flex items-center justify-between border-b border-[rgba(230,220,203,.14)] px-4 py-3">
      <span className="hud-sc text-base text-hud-ink">{t("title", { level })}</span>
      <span className="flex items-center gap-2 text-sm text-[#b8ab95]">
        {free > 0 && <b className="hud-sc text-[#ffd9a8]">{t("points", { count: free })}</b>}
        <span>{spent} / {level}</span>
      </span>
    </header>
  );
}
