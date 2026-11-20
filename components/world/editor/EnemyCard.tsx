'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, X } from 'lucide-react';

import { MarkerIconGrid } from './maps/MapFieldParts';

import { ColorSwatch } from '@/components/common/fields/ColorSwatch';
import { HudButton, HudIconButton } from '@/components/hud';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { bubbleButton } from '@/components/world/nav/bubble-button';
import {
    DEFAULT_ENEMY_COLOR,
    WORLD_DM_NOTE_MAX,
    WORLD_NAME_MAX,
} from '@/lib/constants/world';
import { useCommittedName } from '@/lib/hooks/world';
import { cn } from '@/lib/utils';
import type { UpdateEnemyData, WorldEnemyPin } from '@/types/world';

const COLOR_DEBOUNCE_MS = 400;

interface EnemyCardProps {
    enemy: WorldEnemyPin;
    actions: {
        onSave(data: UpdateEnemyData): void;
        onDelete(): void;
        onClose(): void;
    };
    embedded?: boolean;
}

export function EnemyCard({
    enemy,
    actions,
    embedded = false,
}: EnemyCardProps) {
    const te = useTranslations('world.enemy');

    const { onSave, onDelete, onClose } = actions;

    const { name, setName, commitName } = useCommittedName(enemy.name, (next) =>
        onSave({ name: next })
    );

    const [note, setNote] = useState(enemy.dmNote ?? '');

    const [color, setColor] = useState(enemy.color ?? DEFAULT_ENEMY_COLOR);

    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const pendingColor = useRef<string | null>(null);

    const saveRef = useRef(onSave);

    useEffect(() => {
        saveRef.current = onSave;
    });

    const flushColor = () => {
        clearTimeout(timer.current);

        if (pendingColor.current === null) return;

        const next = pendingColor.current;

        pendingColor.current = null;
        saveRef.current({ color: next });
    };

    useEffect(() => flushColor, []);

    const pickColor = (next: string) => {
        setColor(next);
        pendingColor.current = next;
        clearTimeout(timer.current);
        timer.current = setTimeout(flushColor, COLOR_DEBOUNCE_MS);
    };

    const commitNote = () => {
        const next = note.trim();

        if (next !== (enemy.dmNote ?? '')) onSave({ dmNote: next });
    };

    return (
        <div
            role="dialog"
            aria-label={enemy.name}
            onKeyDown={(e) => {
                if (e.key !== 'Escape') return;

                e.preventDefault();
                commitName();
                commitNote();
                onClose();
            }}
            className={cn(
                'space-y-2 text-sm text-hud-ink',
                embedded
                    ? 'w-full'
                    : 'w-64 max-w-full rounded-lg border border-hud-rule bg-black/90 p-3 shadow-lg'
            )}
        >
            <div className="flex items-center gap-2">
                <span className="rounded-full bg-red-700 px-2 text-[10px] leading-4 text-white">
                    {te('dmOnly')}
                </span>
                <span className="flex-1" />
                {embedded ? null : (
                    <HudIconButton
                        size="sm"
                        tone="muted"
                        aria-label={te('close')}
                        onClick={onClose}
                    >
                        <X className="size-4" aria-hidden />
                    </HudIconButton>
                )}
            </div>
            <Input
                aria-label={te('name')}
                maxLength={WORLD_NAME_MAX}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <MarkerIconGrid
                aria-label={te('icon')}
                value={enemy.icon}
                cellClassName="h-8"
                className="max-h-24 overflow-y-auto"
                onPick={(icon) => onSave({ icon })}
            />
            <div className="flex items-center gap-2 text-xs">
                <ColorSwatch
                    color={color}
                    label={te('color')}
                    onChange={pickColor}
                />
                {te('color')}
            </div>
            <Textarea
                aria-label={te('note')}
                placeholder={te('notePlaceholder')}
                rows={2}
                maxLength={WORLD_DM_NOTE_MAX}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={commitNote}
            />
            <HudButton className={bubbleButton(true)} onClick={onDelete}>
                <Trash2 className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{te('delete')}</span>
            </HudButton>
        </div>
    );
}
