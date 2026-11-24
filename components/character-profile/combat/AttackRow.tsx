'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crosshair, Swords } from 'lucide-react';

import { Breakdown } from './Breakdown';

import { HudButton } from '@/components/hud';
import { AttackType } from '@/lib/constants/battle';
import { cn } from '@/lib/utils';
import { signed } from '@/lib/utils/common/format';
import { stagger } from '@/lib/utils/common/motion';
import type { SheetAttack, SheetTotal } from '@/types/characters';

type Panel = 'hit' | 'damage';

function StatButton({
    label,
    value,
    pressed,
    onClick,
}: {
    label: string;
    value: string;
    pressed: boolean;
    onClick: () => void;
}) {
    return (
        <HudButton
            aria-pressed={pressed}
            onClick={onClick}
            className={cn(
                'motion-press flex min-h-11 min-w-20 flex-col items-center justify-center rounded-lg border px-3 text-center hover:bg-hud-raised',
                pressed ? 'border-hud-gold' : 'border-hud-line'
            )}
        >
            <span className="text-xs tracking-[.08em] text-hud-muted uppercase">
                {label}
            </span>
            <b className="hud-sc text-xl leading-tight text-hud-ink tabular-nums">
                {value}
            </b>
        </HudButton>
    );
}

export function AttackRow({
    attack: a,
    index,
}: {
    attack: SheetAttack;
    index: number;
}) {
    const t = useTranslations('characterProfile.combat');

    const [open, setOpen] = useState<Panel | null>(null);

    const toggle = (panel: Panel) =>
        setOpen((v) => (v === panel ? null : panel));

    const detail: Record<Panel, { title: string; total: SheetTotal }> = {
        hit: { title: t('toHit'), total: a.toHit },
        damage: { title: t('avgDamage'), total: a.avgDamage },
    };

    const Icon = a.kind === AttackType.RANGED ? Crosshair : Swords;

    return (
        <div
            style={stagger(index)}
            className="motion-rise mb-2 rounded-xl border border-hud-line bg-hud-field px-3 py-2.5"
        >
            <div className="flex flex-wrap items-center gap-3">
                <Icon aria-hidden className="size-5 shrink-0 text-hud-gold" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-hud-ink">
                    {a.name}
                </span>
                <StatButton
                    label={t('hitShort')}
                    value={signed(a.toHit.total)}
                    pressed={open === 'hit'}
                    onClick={() => toggle('hit')}
                />
                <StatButton
                    label={t('damage')}
                    value={`\u2248${a.avgDamage.total}`}
                    pressed={open === 'damage'}
                    onClick={() => toggle('damage')}
                />
            </div>
            {open && (
                <div className="mt-2">
                    <p className="text-xs text-hud-gold uppercase">
                        {detail[open].title}
                    </p>
                    <Breakdown lines={detail[open].total.lines} />
                </div>
            )}
        </div>
    );
}
