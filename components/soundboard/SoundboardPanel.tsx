'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';

import { HiddenBuiltinSounds } from './HiddenBuiltinSounds';
import { SoundEditDialog } from './SoundEditDialog';
import { SoundPad } from './SoundPad';
import { SoundUploader } from './SoundUploader';

import { HudButton } from '@/components/hud';
import { HudPanel } from '@/components/hud/page';
import {
    useSoundboardKeys,
    useSoundboardPads,
    useSoundLibrary,
} from '@/lib/hooks/soundboard';
import type { Sound } from '@/types/soundboard';

export function SoundboardPanel({ campaignId }: { campaignId: string }) {
    const t = useTranslations('soundboard');

    const { sounds, play, preview } = useSoundboardPads(campaignId);

    const { hiddenBuiltin } = useSoundLibrary(campaignId);

    const [open, setOpen] = useState(false);

    const [editing, setEditing] = useState(false);

    const [selected, setSelected] = useState<Sound | null>(null);

    useSoundboardKeys(sounds, play);

    const Chevron = open ? ChevronUp : ChevronDown;

    return (
        <HudPanel as="div" className="w-72 max-w-full">
            <HudButton
                className="flex w-full items-center justify-between text-sm text-hud-ink"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <span className="hud-sc">{t('title')}</span>
                <Chevron className="size-4" />
            </HudButton>
            {open && (
                <div className="mt-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <HudButton
                            className="flex items-center gap-1 text-xs text-hud-muted hover:text-hud-ink"
                            aria-pressed={editing}
                            onClick={() => setEditing((v) => !v)}
                        >
                            <Pencil className="size-3" />
                            {editing ? t('done') : t('edit.toggle')}
                        </HudButton>
                        {editing && <SoundUploader campaignId={campaignId} />}
                    </div>
                    <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
                        {sounds.map((sound, index) => (
                            <SoundPad
                                key={sound.id}
                                sound={sound}
                                index={index}
                                editing={editing}
                                actions={{
                                    onPlay: play,
                                    onPreview: preview,
                                    onEdit: setSelected,
                                }}
                            />
                        ))}
                    </div>
                    {editing && (
                        <HiddenBuiltinSounds
                            campaignId={campaignId}
                            hiddenBuiltin={hiddenBuiltin}
                        />
                    )}
                </div>
            )}
            <SoundEditDialog
                campaignId={campaignId}
                sound={selected}
                hiddenBuiltin={hiddenBuiltin}
                onClose={() => setSelected(null)}
            />
        </HudPanel>
    );
}
