'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { useSoundLabel } from './labels';
import { soundIcon } from './sound-icon';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { HudButton } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { PRESET_SLOTS } from '@/lib/constants/soundboard';
import { useSearch } from '@/lib/hooks/common';
import { usePresetMutations, useSoundLibrary } from '@/lib/hooks/soundboard';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { LibrarySound, SoundPreset } from '@/types/soundboard';

function SoundOption({
    sound,
    onPick,
}: {
    sound: LibrarySound;
    onPick: (sound: LibrarySound) => void;
}) {
    const t = useTranslations('soundboard');

    const label = useSoundLabel(sound);

    const Icon = soundIcon(sound.icon);

    return (
        <HudButton
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-hud-ink hover:bg-hud-gold/10"
            aria-label={t('slot.pick', { name: label })}
            onClick={() => onPick(sound)}
        >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{label}</span>
        </HudButton>
    );
}

export function SoundSlotDialog({
    open,
    slotIndex,
    preset,
    onClose,
}: {
    open: boolean;
    slotIndex: number;
    preset: SoundPreset | null;
    onClose: () => void;
}) {
    const t = useTranslations('soundboard');

    const tr = useTranslator();

    const { sounds } = useSoundLibrary();

    const { update } = usePresetMutations();

    const fieldsOf = useCallback(
        (s: LibrarySound) => [s.name ?? (s.nameKey ? tr(s.nameKey) : '')],
        [tr]
    );

    const search = useSearch(sounds, fieldsOf);

    const assign = async (id: string | null) => {
        if (!preset) return;

        const slots = Array.from(
            { length: PRESET_SLOTS },
            (_, i) => preset.slots[i] ?? null
        );

        slots[slotIndex] = id;

        if (await update.mutateOk({ id: preset.id, patch: { slots } }))
            onClose();
    };

    return (
        <ResponsiveDialog
            hud
            open={open}
            onOpenChange={(next) => !next && onClose()}
            title={t('slot.title', { n: slotIndex + 1 })}
            footer={
                <>
                    <Button variant="outline" asChild>
                        <Link href="/library/sounds" target="_blank">
                            {t('slot.openLibrary')}
                        </Link>
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={update.isPending}
                        onClick={() => void assign(null)}
                    >
                        {t('slot.clear')}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-2">
                <SearchInput
                    value={search.query.value}
                    onChange={search.query.set}
                    label={t('slot.search')}
                />
                <div className="flex max-h-72 flex-col overflow-y-auto">
                    {search.items.map((sound) => (
                        <SoundOption
                            key={sound.id}
                            sound={sound}
                            onPick={(s) => void assign(s.id)}
                        />
                    ))}
                    {!search.items.length && (
                        <p className="py-4 text-center text-sm text-hud-muted">
                            {t('slot.none')}
                        </p>
                    )}
                </div>
            </div>
        </ResponsiveDialog>
    );
}
