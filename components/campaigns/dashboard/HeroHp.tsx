import type { HeroHpValue } from '@/types/campaigns';

export function HeroHp({ hp }: { hp: HeroHpValue }) {
    const pct =
        hp.max > 0
            ? Math.min(100, Math.max(0, (hp.current / hp.max) * 100))
            : 0;

    return (
        <div className="min-w-0">
            <p className="text-hud-ink text-sm">
                HP{' '}
                <span className="hud-num">
                    {hp.current}/{hp.max}
                </span>
                {hp.temp > 0 && (
                    <span className="hud-num text-hud-muted">
                        {' '}
                        (+{hp.temp})
                    </span>
                )}
            </p>
            <div
                role="meter"
                aria-label="HP"
                aria-valuemin={0}
                aria-valuemax={hp.max}
                aria-valuenow={hp.current}
                aria-valuetext={`${hp.current}/${hp.max}`}
                className="ds-inset mt-1 h-2 overflow-hidden rounded-full"
            >
                <div
                    className="h-full rounded-full"
                    style={{
                        width: `${pct}%`,
                        background:
                            'linear-gradient(var(--hud-hp), var(--hud-hp-2))',
                    }}
                />
            </div>
        </div>
    );
}
