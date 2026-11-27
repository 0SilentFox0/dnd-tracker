import { type HpTone,hpTone } from '@/lib/utils/battle/view/health';
import type { HeroHpValue } from '@/types/campaigns';

const TONE_GRADIENT: Record<HpTone, string> = {
    high: 'linear-gradient(#9be87a, #3c8a2c)',
    mid: 'linear-gradient(#ffe27a, #c4921a)',
    low: 'linear-gradient(#ff8264, #a32216)',
};

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
                    data-hp-tone={hpTone(pct / 100)}
                    style={{
                        width: `${pct}%`,
                        background: TONE_GRADIENT[hpTone(pct / 100)],
                    }}
                />
            </div>
        </div>
    );
}
