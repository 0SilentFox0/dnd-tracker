import { useTranslations } from 'next-intl';

export function MoveBar({ used, max }: { used: number; max: number }) {
    const t = useTranslations('battle.dock');

    const left = Math.max(0, max - used);

    return (
        <div
            role="meter"
            aria-label={t('move')}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={left}
            className="grid w-full min-w-16 grid-cols-[auto_1fr] items-center gap-2 text-[10px] text-[#e6dccb] max-md:gap-1 max-md:text-[11px] max-md:tabular-nums"
        >
            <span className="hud-sc font-bold tracking-[.08em] whitespace-nowrap uppercase">
                {t('moveCells', { left })}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-black/45 ring-1 ring-black/30 max-md:h-1">
                <span
                    className="block h-full rounded-full bg-[#16a765]"
                    style={{ width: `${max ? (left / max) * 100 : 0}%` }}
                />
            </span>
        </div>
    );
}
