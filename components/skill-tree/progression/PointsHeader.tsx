import { pointsText } from "./node-labels";

export function PointsHeader({ level, spent, free }: { level: number; spent: number; free: number }) {
  return (
    <header className="flex items-center justify-between border-b border-[rgba(230,220,203,.14)] px-4 py-3">
      <span className="hud-sc text-base text-hud-ink">Прокачка · рівень {level}</span>
      <span className="flex items-center gap-2 text-sm text-[#b8ab95]">
        {free > 0 && <b className="hud-sc text-[#ffd9a8]">{pointsText(free)}</b>}
        <span>{spent} / {level}</span>
      </span>
    </header>
  );
}
