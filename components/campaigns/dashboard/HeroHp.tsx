import type { HeroHpValue } from "@/types/campaigns";

export function HeroHp({ hp }: { hp: HeroHpValue }) {
  const pct = hp.max > 0 ? Math.min(100, Math.max(0, (hp.current / hp.max) * 100)) : 0;

  return (
    <div className="min-w-0">
      <p className="text-sm text-hud-ink">
        HP {hp.current}/{hp.max}
        {hp.temp > 0 && <span className="text-hud-muted"> (+{hp.temp})</span>}
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hud-rule">
        <div className="h-full rounded-full bg-hud-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
