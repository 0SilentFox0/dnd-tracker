'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';

import { usePresetName } from '../labels';

import { HudButton, HudIconButton } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PRESET_NAME_MAX } from '@/lib/constants/soundboard';
import { useConfirm } from '@/lib/hooks/common';
import { usePresetMutations } from '@/lib/hooks/soundboard';
import { cn } from '@/lib/utils';
import type { SoundPreset } from '@/types/soundboard';

export function PresetList({
    presets,
    selectedId,
    onSelect,
}: {
    presets: SoundPreset[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const t = useTranslations('soundboard');

    const confirm = useConfirm();

    const presetName = usePresetName();

    const { create, remove, reorder } = usePresetMutations();

    const [name, setName] = useState('');

    const add = async () => {
        const trimmed = name.trim();

        if (!trimmed) return;

        const made = await create.mutateAsync(trimmed).catch(() => null);

        if (made) {
            setName('');
            onSelect(made.id);
        }
    };

    const move = (index: number, delta: -1 | 1) => {
        const ids = presets.map((p) => p.id);

        const [moved] = ids.splice(index, 1);

        ids.splice(index + delta, 0, moved);
        void reorder.mutateOk(ids);
    };

    const drop = async (preset: SoundPreset) => {
        const confirmed = await confirm({
            title: t('preset.deleteTitle', { name: presetName(preset) }),
            confirmLabel: t('preset.delete'),
            destructive: true,
        });

        if (confirmed) void remove.mutateOk(preset.id);
    };

    return (
        <div className="flex flex-col gap-2">
            <form
                className="flex gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    void add();
                }}
            >
                <Input
                    value={name}
                    maxLength={PRESET_NAME_MAX}
                    placeholder={t('preset.placeholder')}
                    aria-label={t('preset.create')}
                    onChange={(e) => setName(e.target.value)}
                />
                <Button
                    type="submit"
                    size="sm"
                    disabled={!name.trim() || create.isPending}
                >
                    {t('preset.add')}
                </Button>
            </form>
            {!presets.length && (
                <p className="text-sm text-hud-muted">{t('preset.none')}</p>
            )}
            <ul className="flex flex-col gap-1">
                {presets.map((preset, index) => {
                    const label = presetName(preset);

                    return (
                        <li
                            key={preset.id}
                            className={cn(
                                'flex items-center gap-1 rounded-md border border-hud-rule px-2 py-1',
                                preset.id === selectedId && 'bg-hud-panel-2'
                            )}
                        >
                            <HudButton
                                className="min-w-0 flex-1 truncate text-left text-sm text-hud-ink"
                                aria-pressed={preset.id === selectedId}
                                onClick={() => onSelect(preset.id)}
                            >
                                {label}
                            </HudButton>
                            <HudIconButton
                                tone="muted"
                                aria-label={t('preset.up', { name: label })}
                                disabled={index === 0}
                                onClick={() => move(index, -1)}
                            >
                                <ArrowUp className="size-4" />
                            </HudIconButton>
                            <HudIconButton
                                tone="muted"
                                aria-label={t('preset.down', { name: label })}
                                disabled={index === presets.length - 1}
                                onClick={() => move(index, 1)}
                            >
                                <ArrowDown className="size-4" />
                            </HudIconButton>
                            <HudIconButton
                                tone="muted"
                                aria-label={`${t('preset.delete')}: ${label}`}
                                onClick={() => void drop(preset)}
                            >
                                <Trash2 className="size-4" />
                            </HudIconButton>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
