'use client';

import { useTranslations } from 'next-intl';
import { Headphones } from 'lucide-react';

import { useSoundLabel } from './labels';
import { soundIcon } from './sound-icon';

import { HudButton, HudIconButton } from '@/components/hud';
import type { LibrarySound } from '@/types/soundboard';

type PadActions = {
    onPlay: (sound: LibrarySound) => void;
    onPreview: (sound: LibrarySound) => void;
    onReplace: (index: number) => void;
};

function FilledPad({
    sound,
    index,
    actions,
    replacing,
}: {
    sound: LibrarySound;
    index: number;
    actions: PadActions;
    replacing: boolean;
}) {
    const t = useTranslations('soundboard');

    const Icon = soundIcon(sound.icon);

    const label = useSoundLabel(sound);

    return (
        <div
            className="relative flex min-w-0 flex-col rounded-lg border border-hud-rule bg-hud-panel"
            style={sound.color ? { borderColor: sound.color } : undefined}
        >
            <HudButton
                className="flex min-w-0 flex-1 flex-col items-center gap-1 p-2 text-hud-ink"
                aria-label={
                    replacing
                        ? t('slot.replace', { n: index + 1 })
                        : t('play', { name: label })
                }
                onClick={() =>
                    replacing ? actions.onReplace(index) : actions.onPlay(sound)
                }
            >
                <Icon className="size-5" />
                <span className="line-clamp-2 text-center text-xs break-words">
                    {label}
                </span>
            </HudButton>
            <span className="pointer-events-none absolute top-1 left-1.5 text-[10px] text-hud-muted">
                {index + 1}
            </span>
            <HudIconButton
                className="absolute top-0 right-0"
                tone="muted"
                aria-label={t('preview', { name: label })}
                title={t('previewHint')}
                onClick={() => actions.onPreview(sound)}
            >
                <Headphones className="size-4" />
            </HudIconButton>
        </div>
    );
}

export function SoundPad({
    sound,
    index,
    actions,
    replacing,
}: {
    sound: LibrarySound | null;
    index: number;
    actions: PadActions;
    replacing: boolean;
}) {
    const t = useTranslations('soundboard');

    if (sound)
        return (
            <FilledPad
                sound={sound}
                index={index}
                actions={actions}
                replacing={replacing}
            />
        );

    const placeholder =
        'relative flex min-h-16 min-w-0 items-center justify-center rounded-lg border border-dashed border-hud-rule text-xs text-hud-muted';

    const number = (
        <span className="absolute top-1 left-1.5 text-[10px]">{index + 1}</span>
    );

    return replacing ? (
        <HudButton
            className={placeholder}
            aria-label={t('slot.replace', { n: index + 1 })}
            onClick={() => actions.onReplace(index)}
        >
            {number}+
        </HudButton>
    ) : (
        <div
            className={placeholder}
            role="img"
            aria-label={t('slot.empty', { n: index + 1 })}
        >
            {number}
        </div>
    );
}
