'use client';
import { useTranslations } from 'next-intl';

import type { CompendiumPhase } from '@/lib/hooks/compendium-import';
import type { MediaProgress } from '@/types/compendium-import';

export function StepHeading({
    title,
    phase,
    media,
}: {
    title: string;
    phase: CompendiumPhase;
    media: MediaProgress | null;
}) {
    const t = useTranslations('compendium.import.progress');

    const done = media ? media.saved + media.failed : 0;

    return (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="hud-sc text-lg text-hud-ink">{title}</h2>
            <p
                role="status"
                aria-live="polite"
                className="text-sm text-hud-muted"
            >
                {phase !== 'idle' &&
                    t(phase === 'media' && !media ? 'confirming' : phase, {
                        done,
                        total: media?.total ?? 0,
                    })}
            </p>
        </div>
    );
}
