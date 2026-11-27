'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { OptionButton } from '@/components/hud/OptionButton';
import { ALIGNMENTS } from '@/lib/constants/alignment';
import { useRovingIndex } from '@/lib/hooks/common';
import { alignmentKey } from '@/lib/utils/characters/alignment';

interface AlignmentGridProps {
    id: string;
    value: string | null;
    onChange: (value: string | null) => void;
    allowNone?: boolean;
    noneLabel?: ReactNode;
}

export function AlignmentGrid({
    id,
    value,
    onChange,
    allowNone = false,
    noneLabel,
}: AlignmentGridProps) {
    const t = useTranslations('gameTerms.alignments');

    const tc = useTranslations('common.ui');

    const group = useRef<HTMLDivElement>(null);

    const selected = alignmentKey(value);

    const selectedIndex = ALIGNMENTS.findIndex(
        (name) => alignmentKey(name) === selected
    );

    const roving = useRovingIndex({
        count: ALIGNMENTS.length,
        active: Math.max(selectedIndex, 0),
        onMove: (i) => onChange(ALIGNMENTS[i]),
        cols: 3,
    });

    // OptionButton takes no tabIndex prop, so the roving stop is applied to its element
    useEffect(() => {
        group.current
            ?.querySelectorAll<HTMLElement>('[data-cell]')
            .forEach((el, i) => {
                el.tabIndex = roving.tabIndex(i);
            });
    });

    return (
        <div className="grid gap-2">
            <div
                id={id}
                ref={group}
                role="radiogroup"
                aria-label={t('label')}
                onKeyDown={roving.onKeyDown}
                className="grid grid-cols-3 gap-1.5"
            >
                {ALIGNMENTS.map((name, i) => {
                    const key = alignmentKey(name) ?? 'trueNeutral';

                    return (
                        <span
                            key={name}
                            title={t(`${key}.name`)}
                            ref={(el) => {
                                const cell =
                                    el?.querySelector<HTMLElement>('button');

                                cell?.setAttribute('data-cell', '');
                                roving.itemRef(i)(cell ?? null);
                            }}
                            className="contents"
                        >
                            <OptionButton
                                role="radio"
                                variant="form"
                                checked={selected === key}
                                onClick={() => onChange(name)}
                                text={{
                                    title: (
                                        <>
                                            <span aria-hidden className="block">
                                                {t(`${key}.short`)}
                                            </span>
                                            <span className="block text-xs font-normal leading-tight text-[var(--hud-muted)]">
                                                {t(`${key}.name`)}
                                            </span>
                                        </>
                                    ),
                                }}
                                className="min-h-11 text-center"
                            />
                        </span>
                    );
                })}
            </div>
            {allowNone && (
                <OptionButton
                    role="radio"
                    variant="form"
                    checked={!value}
                    onClick={() => onChange(null)}
                    text={{ title: noneLabel ?? tc('noneLabel') }}
                    className="min-h-11 text-center"
                />
            )}
        </div>
    );
}
