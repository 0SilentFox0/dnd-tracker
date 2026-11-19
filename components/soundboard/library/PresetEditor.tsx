'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

import { usePresetName, useSoundLabel } from '../labels';
import { soundIcon } from '../sound-icon';
import { SoundSlotDialog } from '../SoundSlotDialog';

import { HudButton, HudIconButton } from '@/components/hud';
import { Input } from '@/components/ui/input';
import { PRESET_NAME_MAX, PRESET_SLOTS } from '@/lib/constants/soundboard';
import { usePresetMutations, useSoundLibrary } from '@/lib/hooks/soundboard';
import type { LibrarySound, SoundPreset } from '@/types/soundboard';

function SlotTile({
    sound,
    index,
    onOpen,
    onClear,
}: {
    sound: LibrarySound | null;
    index: number;
    onOpen: () => void;
    onClear: () => void;
}) {
    const t = useTranslations('soundboard');

    return (
        <div className="relative">
            <HudButton
                className="flex min-h-16 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-hud-rule p-2 text-hud-ink"
                aria-label={t('slot.replace', { n: index + 1 })}
                onClick={onOpen}
            >
                <span className="absolute top-1 left-1.5 text-[10px] text-hud-muted">
                    {index + 1}
                </span>
                {sound ? <FilledSlot sound={sound} /> : <span>+</span>}
            </HudButton>
            {sound && (
                <HudIconButton
                    className="absolute top-0 right-0"
                    tone="muted"
                    aria-label={t('preset.clearSlot', { n: index + 1 })}
                    onClick={onClear}
                >
                    <X className="size-4" />
                </HudIconButton>
            )}
        </div>
    );
}

function FilledSlot({ sound }: { sound: LibrarySound }) {
    const Icon = soundIcon(sound.icon);

    const label = useSoundLabel(sound);

    return (
        <>
            <Icon className="size-5" />
            <span className="line-clamp-2 text-center text-xs break-words">
                {label}
            </span>
        </>
    );
}

export function PresetEditor({ preset }: { preset: SoundPreset }) {
    const t = useTranslations('soundboard');

    const presetName = usePresetName();

    const { byId } = useSoundLibrary();

    const { update } = usePresetMutations();

    const [draft, setDraft] = useState<string | null>(null);

    const [slotIndex, setSlotIndex] = useState<number | null>(null);

    const shown = draft ?? presetName(preset);

    const commitName = () => {
        const next = (draft ?? '').trim();

        if (draft !== null && next && next !== presetName(preset))
            void update.mutateOk({ id: preset.id, patch: { name: next } });

        setDraft(null);
    };

    const clear = (index: number) => {
        const slots = Array.from({ length: PRESET_SLOTS }, (_, i) =>
            i === index ? null : (preset.slots[i] ?? null)
        );

        void update.mutateOk({ id: preset.id, patch: { slots } });
    };

    return (
        <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-hud-muted">
                {t('preset.rename')}
                <Input
                    value={shown}
                    maxLength={PRESET_NAME_MAX}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitName}
                />
            </label>
            <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: PRESET_SLOTS }, (_, index) => {
                    const id = preset.slots[index];

                    return (
                        <SlotTile
                            key={index}
                            sound={(id && byId.get(id)) || null}
                            index={index}
                            onOpen={() => setSlotIndex(index)}
                            onClear={() => clear(index)}
                        />
                    );
                })}
            </div>
            <SoundSlotDialog
                open={slotIndex !== null}
                slotIndex={slotIndex ?? 0}
                preset={preset}
                onClose={() => setSlotIndex(null)}
            />
        </div>
    );
}
