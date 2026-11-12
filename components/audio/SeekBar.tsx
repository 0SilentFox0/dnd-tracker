'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useAudioPosition } from '@/lib/hooks/audio';

const clock = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function SeekBar({
    onSeek,
    disabled,
}: {
    onSeek: (sec: number) => void;
    disabled: boolean;
}) {
    const t = useTranslations('music.dm');

    const position = useAudioPosition();

    const [drag, setDrag] = useState<number | null>(null);

    if (!position) return null;

    const { positionSec, durationSec } = position;

    const shown = drag ?? positionSec;

    const commit = () => {
        if (drag === null) return;

        onSeek(drag);
        setDrag(null);
    };

    return (
        <div className="mt-2 flex items-center gap-2 text-hud-muted tabular-nums">
            <span className="w-9 text-right">{clock(shown)}</span>
            <input
                type="range"
                aria-label={t('seek')}
                min={0}
                max={Math.floor(durationSec)}
                step={1}
                value={Math.floor(shown)}
                disabled={disabled}
                onChange={(e) => setDrag(Number(e.target.value))}
                onPointerUp={commit}
                onKeyUp={commit}
                onBlur={commit}
                className="flex-1 accent-[var(--gold)]"
            />
            <span className="w-9">{clock(durationSec)}</span>
        </div>
    );
}
