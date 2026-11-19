'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { usePresetName, useSoundLabel } from '../labels';
import { SoundIconPicker } from './SoundIconPicker';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Slider } from '@/components/ui/slider';
import { SOUND_NAME_MAX } from '@/lib/constants/soundboard';
import { useConfirm } from '@/lib/hooks/common';
import { useLibraryMutations } from '@/lib/hooks/soundboard';
import type { LibrarySound, SoundPreset } from '@/types/soundboard';

const DEFAULT_COLOR = '#c8a24a';

function EditForm({
    sound,
    presets,
    onClose,
}: {
    sound: LibrarySound;
    presets: SoundPreset[];
    onClose: () => void;
}) {
    const t = useTranslations('soundboard');

    const tc = useTranslations('common.actions');

    const confirm = useConfirm();

    const presetName = usePresetName();

    const { update, remove } = useLibraryMutations();

    const label = useSoundLabel(sound);

    const [name, setName] = useState(label);

    const [icon, setIcon] = useState(sound.icon);

    const [volume, setVolume] = useState(sound.volume);

    const [color, setColor] = useState(sound.color ?? DEFAULT_COLOR);

    const trimmed = name.trim();

    const save = async () => {
        const ok = await update.mutateOk({
            id: sound.id,
            patch: { name: trimmed, icon, volume, color },
        });

        if (ok) onClose();
    };

    const drop = async () => {
        const using = presets
            .filter((p) => p.slots.includes(sound.id))
            .map(presetName);

        const confirmed = await confirm({
            title: using.length
                ? t('edit.deleteUsed', {
                      name: label,
                      presets: using.join(', '),
                  })
                : t('edit.deleteTitle', { name: label }),
            confirmLabel: t('edit.delete'),
            destructive: true,
        });

        if (confirmed && (await remove.mutateOk(sound.id))) onClose();
    };

    return (
        <ResponsiveDialog
            hud
            open
            onOpenChange={(open) => !open && onClose()}
            title={t('edit.title')}
            description={label}
            footer={
                <>
                    <Button variant="destructive" onClick={() => void drop()}>
                        {t('edit.delete')}
                    </Button>
                    <Button
                        onClick={() => void save()}
                        disabled={!trimmed || update.isPending}
                    >
                        {tc('save')}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs text-hud-muted">
                    {t('edit.name')}
                    <Input
                        value={name}
                        maxLength={SOUND_NAME_MAX}
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>
                <SoundIconPicker
                    value={icon}
                    onChange={setIcon}
                    label={t('edit.icon')}
                />
                <label className="flex flex-col gap-1 text-xs text-hud-muted">
                    {t('edit.volume')}
                    <Slider
                        value={volume}
                        min={0}
                        max={1}
                        step={0.05}
                        onValueChange={setVolume}
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-hud-muted">
                    {t('edit.color')}
                    <Input
                        type="color"
                        value={color}
                        className="h-9 w-16 p-1"
                        onChange={(e) => setColor(e.target.value)}
                    />
                </label>
            </div>
        </ResponsiveDialog>
    );
}

export function SoundEditDialog({
    sound,
    presets,
    onClose,
}: {
    sound: LibrarySound | null;
    presets: SoundPreset[];
    onClose: () => void;
}) {
    if (!sound) return null;

    return (
        <EditForm
            key={sound.id}
            sound={sound}
            presets={presets}
            onClose={onClose}
        />
    );
}
