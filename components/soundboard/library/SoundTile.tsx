'use client';

import { useTranslations } from 'next-intl';
import { Headphones, Pencil } from 'lucide-react';

import { useSoundLabel } from '../labels';
import { soundIcon } from '../sound-icon';

import { HudButton, HudIconButton } from '@/components/hud';
import { HudPill } from '@/components/hud/page';
import type { LibrarySound } from '@/types/soundboard';

export function SoundTile({
    sound,
    actions,
}: {
    sound: LibrarySound;
    actions: {
        onPreview: (sound: LibrarySound) => void;
        onEdit: (sound: LibrarySound) => void;
    };
}) {
    const t = useTranslations('soundboard');

    const Icon = soundIcon(sound.icon);

    const label = useSoundLabel(sound);

    const builtin = sound.source === 'builtin';

    return (
        <div
            className="flex min-w-0 items-center gap-2 rounded-lg border border-hud-rule bg-hud-panel p-2"
            style={sound.color ? { borderColor: sound.color } : undefined}
        >
            <Icon className="size-5 shrink-0 text-hud-gold" />
            <span className="min-w-0 flex-1 truncate text-sm text-hud-ink">
                {label}
            </span>
            {builtin && <HudPill>{t('library.builtin')}</HudPill>}
            <HudIconButton
                tone="muted"
                aria-label={t('preview', { name: label })}
                onClick={() => actions.onPreview(sound)}
            >
                <Headphones className="size-4" />
            </HudIconButton>
            {!builtin && (
                <HudButton
                    className="shrink-0 text-hud-muted hover:text-hud-ink"
                    aria-label={t('edit.open', { name: label })}
                    onClick={() => actions.onEdit(sound)}
                >
                    <Pencil className="size-4" />
                </HudButton>
            )}
        </div>
    );
}
