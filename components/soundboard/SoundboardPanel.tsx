'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';

import { usePresetName } from './labels';
import { SoundPad } from './SoundPad';
import { SoundSlotDialog } from './SoundSlotDialog';

import { HudButton } from '@/components/hud';
import { HudPanel } from '@/components/hud/page';
import { SelectField } from '@/components/ui/select-field';
import { useSoundboardKeys, useSoundboardPads } from '@/lib/hooks/soundboard';

export function SoundboardPanel({ campaignId }: { campaignId: string }) {
    const t = useTranslations('soundboard');

    const presetName = usePresetName();

    const { preset, presets, setPresetId, pads, play, preview } =
        useSoundboardPads(campaignId);

    const [open, setOpen] = useState(false);

    const [replacing, setReplacing] = useState(false);

    const [slotIndex, setSlotIndex] = useState<number | null>(null);

    useSoundboardKeys(pads, play);

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
                        <SelectField
                            aria-label={t('library.presets')}
                            value={preset?.id ?? ''}
                            onValueChange={setPresetId}
                            options={presets.map((p) => ({
                                value: p.id,
                                label: presetName(p),
                            }))}
                            disabled={!presets.length}
                            className="min-w-0 flex-1"
                        />
                        <HudButton
                            className="flex shrink-0 items-center gap-1 text-xs text-hud-muted hover:text-hud-ink"
                            aria-pressed={replacing}
                            disabled={!preset}
                            onClick={() => setReplacing((v) => !v)}
                        >
                            <Pencil className="size-3" />
                            {replacing ? t('done') : t('edit.toggle')}
                        </HudButton>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {pads.map((sound, index) => (
                            <SoundPad
                                key={index}
                                sound={sound}
                                index={index}
                                replacing={replacing}
                                actions={{
                                    onPlay: play,
                                    onPreview: preview,
                                    onReplace: setSlotIndex,
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
            <SoundSlotDialog
                open={slotIndex !== null}
                slotIndex={slotIndex ?? 0}
                preset={preset}
                onClose={() => setSlotIndex(null)}
            />
        </HudPanel>
    );
}
