'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';

export function TurnCountdown({
    seconds,
    onElapsed,
    onStay,
    onDisable,
}: {
    seconds: number;
    onElapsed: () => void;
    onStay: () => void;
    onDisable: () => void;
}) {
    const t = useTranslations('battle.countdown');

    const [left, setLeft] = useState(seconds);

    const elapse = useEffectEvent(onElapsed);

    useEffect(() => {
        const started = Date.now();

        const id = setInterval(() => {
            const remaining =
                seconds - Math.floor((Date.now() - started) / 1_000);

            setLeft(Math.max(0, remaining));

            if (remaining <= 0) {
                clearInterval(id);
                elapse();
            }
        }, 250);

        return () => clearInterval(id);
    }, [seconds]);

    return (
        <div className="relative mt-2 flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden border border-[var(--enemy)] bg-[var(--enemy)]/20 px-3.5 py-1.5">
            <span className="flex-1 text-[15px] text-[var(--ink)]">
                {t.rich('endsIn', { left, b: (chunks) => <b>{chunks}</b> })}
                <span role="alert" className="block text-[12px] opacity-80">
                    {t('reason')}
                </span>
            </span>
            <HudButton
                type="button"
                onClick={onStay}
                className="hud-sc h-9 border border-white/40 px-3.5 text-[15px] font-bold text-[var(--ink)]"
            >
                {t('stay')}
            </HudButton>
            <HudButton
                type="button"
                onClick={onDisable}
                className="hud-sc h-9 border border-white/20 px-3 text-[13px] text-[var(--ink)]"
            >
                {t('disable')}
            </HudButton>
            <i
                className="absolute bottom-0 left-0 h-[3px] bg-[#c0392b]"
                style={{
                    animation: `hud-countdown ${seconds}s linear forwards`,
                }}
            />
        </div>
    );
}
