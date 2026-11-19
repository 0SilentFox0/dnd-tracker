'use client';

import { useTranslations } from 'next-intl';
import { Headphones, Pencil } from 'lucide-react';

import { soundIcon } from './sound-icon';

import { HudButton, HudIconButton } from '@/components/hud';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { Sound } from '@/types/soundboard';

export function useSoundLabel(sound: Sound): string {
    const t = useTranslator();

    return sound.source === 'builtin' ? t(sound.name) : sound.name;
}

export function SoundPad({
    sound,
    index,
    actions,
    editing,
}: {
    sound: Sound;
    index: number;
    actions: {
        onPlay: (sound: Sound) => void;
        onPreview: (sound: Sound) => void;
        onEdit: (sound: Sound) => void;
    };
    editing: boolean;
}) {
    const t = useTranslations();

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
                    editing
                        ? t('soundboard.edit.open', { name: label })
                        : t('soundboard.play', { name: label })
                }
                onClick={() =>
                    editing ? actions.onEdit(sound) : actions.onPlay(sound)
                }
            >
                {editing ? (
                    <Pencil className="size-5" />
                ) : (
                    <Icon className="size-5" />
                )}
                <span className="line-clamp-2 text-center text-xs break-words">
                    {label}
                </span>
            </HudButton>
            {index < 9 && (
                <span className="pointer-events-none absolute top-1 left-1.5 text-[10px] text-hud-muted">
                    {index + 1}
                </span>
            )}
            <HudIconButton
                className="absolute top-0 right-0"
                tone="muted"
                aria-label={t('soundboard.preview', { name: label })}
                title={t('soundboard.previewHint')}
                onClick={() => actions.onPreview(sound)}
            >
                <Headphones className="size-4" />
            </HudIconButton>
        </div>
    );
}
