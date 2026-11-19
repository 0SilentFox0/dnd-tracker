'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useSoundLabel } from './SoundPad';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Slider } from '@/components/ui/slider';
import { SOUND_NAME_MAX } from '@/lib/constants/soundboard';
import { useConfirm } from '@/lib/hooks/common';
import { useSoundMutations } from '@/lib/hooks/soundboard';
import type { Sound } from '@/types/soundboard';

const DEFAULT_COLOR = '#c8a24a';

function EditForm({
    campaignId,
    sound,
    hiddenBuiltin,
    onClose,
}: {
    campaignId: string;
    sound: Sound;
    hiddenBuiltin: string[];
    onClose: () => void;
}) {
    const t = useTranslations();

    const confirm = useConfirm();

    const { update, remove, hide } = useSoundMutations(campaignId);

    const builtin = sound.source === 'builtin';

    const label = useSoundLabel(sound);

    const [name, setName] = useState(label);

    const [volume, setVolume] = useState(sound.volume);

    const [color, setColor] = useState(sound.color ?? DEFAULT_COLOR);

    const trimmed = name.trim();

    const save = async () => {
        if (builtin) return onClose();

        const ok = await update.mutateOk({
            id: sound.id,
            patch: { name: trimmed, volume, color },
        });

        if (ok) onClose();
    };

    const drop = async () => {
        const confirmed = await confirm({
            title: t(
                builtin
                    ? 'soundboard.edit.hideTitle'
                    : 'soundboard.edit.deleteTitle',
                { name: label }
            ),
            confirmLabel: t(
                builtin ? 'soundboard.edit.hide' : 'soundboard.edit.delete'
            ),
            destructive: !builtin,
        });

        if (!confirmed) return;

        const ok = builtin
            ? await hide.mutateOk([...hiddenBuiltin, sound.id])
            : await remove.mutateOk(sound.id);

        if (ok) onClose();
    };

    return (
        <ResponsiveDialog
            hud
            open
            onOpenChange={(open) => !open && onClose()}
            title={t('soundboard.edit.title')}
            description={label}
            footer={
                <>
                    <Button variant="destructive" onClick={drop}>
                        {builtin
                            ? t('soundboard.edit.hide')
                            : t('soundboard.edit.delete')}
                    </Button>
                    <Button
                        onClick={save}
                        disabled={!builtin && (!trimmed || update.isPending)}
                    >
                        {t('common.actions.save')}
                    </Button>
                </>
            }
        >
            {!builtin && (
                <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-xs text-hud-muted">
                        {t('soundboard.edit.name')}
                        <Input
                            value={name}
                            maxLength={SOUND_NAME_MAX}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-hud-muted">
                        {t('soundboard.edit.volume')}
                        <Slider
                            value={volume}
                            min={0}
                            max={1}
                            step={0.05}
                            onValueChange={setVolume}
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-hud-muted">
                        {t('soundboard.edit.color')}
                        <Input
                            type="color"
                            value={color}
                            className="h-9 w-16 p-1"
                            onChange={(e) => setColor(e.target.value)}
                        />
                    </label>
                </div>
            )}
        </ResponsiveDialog>
    );
}

export function SoundEditDialog({
    campaignId,
    sound,
    hiddenBuiltin,
    onClose,
}: {
    campaignId: string;
    sound: Sound | null;
    hiddenBuiltin: string[];
    onClose: () => void;
}) {
    if (!sound) return null;

    return (
        <EditForm
            key={sound.id}
            campaignId={campaignId}
            sound={sound}
            hiddenBuiltin={hiddenBuiltin}
            onClose={onClose}
        />
    );
}
