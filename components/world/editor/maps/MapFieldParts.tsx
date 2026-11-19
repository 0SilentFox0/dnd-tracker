'use client';

import type { CSSProperties, Ref } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';

import { ICON_OPTIONS } from '../marker-icon-options';

import { HudButton } from '@/components/hud';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { REVEAL_RADIUS_RANGE } from '@/lib/constants/world';
import { cn } from '@/lib/utils';

export const RADIUS_STEP = 0.005;

export function RadiusRange({
    radius,
    fill,
    setRadius,
    commit,
    label,
    className,
}: {
    radius: number;
    fill: number;
    setRadius: (radius: number) => void;
    commit: () => void;
    label?: string;
    className?: string;
}) {
    return (
        <Slider
            aria-label={label}
            className={cn('hud-range', className)}
            style={{ '--fill': `${fill}%` } as CSSProperties}
            min={REVEAL_RADIUS_RANGE.min}
            max={REVEAL_RADIUS_RANGE.max}
            step={RADIUS_STEP}
            value={radius}
            onValueChange={(v) => setRadius(v)}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
        />
    );
}

export function ChildMapList({
    maps,
    onOpen,
    itemClassName,
}: {
    maps: { id: string; name: string }[];
    onOpen: (id: string) => void;
    itemClassName: string;
}) {
    const t = useTranslations('world');

    return maps.length ? (
        <ul className="space-y-1">
            {maps.map((m) => (
                <li key={m.id}>
                    <HudButton
                        type="button"
                        onClick={() => onOpen(m.id)}
                        className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-md border border-hud-rule bg-black/30 px-3 text-left text-sm hover:border-[var(--gold)]',
                            itemClassName
                        )}
                    >
                        <span className="truncate">{m.name}</span>
                        <ChevronRight
                            className="size-4 shrink-0 text-hud-muted"
                            aria-hidden
                        />
                    </HudButton>
                </li>
            ))}
        </ul>
    ) : (
        <p className="text-xs text-hud-muted">{t('editor.childrenEmpty')}</p>
    );
}

export function ImageFileInput({
    inputRef,
    onFile,
}: {
    inputRef: Ref<HTMLInputElement>;
    onFile: (file: File) => void;
}) {
    return (
        <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
                const file = e.target.files?.[0];

                e.target.value = '';

                if (file) onFile(file);
            }}
        />
    );
}

export function MarkerIconGrid({
    value,
    onPick,
    cellClassName,
    className,
    ...aria
}: {
    value: string | null;
    onPick: (icon: (typeof ICON_OPTIONS)[number]['value']) => void;
    cellClassName: string;
    className?: string;
    'aria-label': string;
}) {
    const t = useTranslations('world');

    return (
        <div
            role="group"
            className={cn('grid grid-cols-4 gap-1.5', className)}
            {...aria}
        >
            {ICON_OPTIONS.map(({ value: option, Icon }) => (
                <HudButton
                    key={option}
                    type="button"
                    title={t(`markerKinds.${option}`)}
                    aria-label={t(`markerKinds.${option}`)}
                    aria-pressed={value === option}
                    onClick={() => onPick(option)}
                    className={cn(
                        'flex items-center justify-center rounded-md border bg-black/40 text-hud-muted hover:text-hud-ink',
                        cellClassName,
                        value === option
                            ? 'metal-gold metal-fill border-[var(--gold)]'
                            : 'border-hud-rule'
                    )}
                >
                    <Icon className="size-5" aria-hidden />
                </HudButton>
            ))}
        </div>
    );
}
