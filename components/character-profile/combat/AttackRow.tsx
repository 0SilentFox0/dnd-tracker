'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crosshair, Dices, Swords } from 'lucide-react';

import { useProfile } from '../ProfileContext';
import { useSheetRoll } from '../sheet/SheetRollProvider';
import { Breakdown } from './Breakdown';

import { HudButton } from '@/components/hud';
import { AttackType } from '@/lib/constants/battle';
import { useCampaignSystem } from '@/lib/hooks/systems';
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
                'motion-press flex min-h-11 min-w-20 flex-col items-center justify-center rounded-[4px] border px-3 text-center hover:bg-hud-raised',
                pressed ? 'border-hud-accent' : 'border-hud-line'
            )}
        >
            <span className="text-xs tracking-[.08em] text-hud-muted uppercase">
                {label}
            </span>
            <b className="hud-num text-xl leading-tight text-hud-ink tabular-nums">
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

    const tr = useTranslations('characterProfile.attackRoll');

    const { campaignId, sheet } = useProfile();

    const { def: system } = useCampaignSystem(campaignId, sheet.system);

    const { onRoll, canRoll } = useSheetRoll();

    const rollable = canRoll && system.sheetTest.accepts({ kind: 'attack' });

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
            className="motion-rise border-b border-hud-rule py-2.5 first:pt-0 last:border-b-0 last:pb-0"
        >
            <div className="flex flex-wrap items-center gap-3">
                <Icon
                    aria-hidden
                    className="size-5 shrink-0 text-hud-accent-fg"
                />
                <span className="min-w-0 flex-1 truncate text-base font-medium text-hud-ink">
                    {a.name}
                </span>
                {rollable && (
                    <HudButton
                        aria-label={tr('roll', { name: a.name })}
                        onClick={() =>
                            onRoll({
                                label: tr('title', { name: a.name }),
                                subject: {
                                    kind: 'attack',
                                    attackId: a.id,
                                },
                            })
                        }
                        className="motion-press flex min-h-11 min-w-11 items-center justify-center rounded-[4px] border border-hud-line text-hud-accent-fg hover:bg-hud-raised"
                    >
                        <Dices aria-hidden className="size-5" />
                    </HudButton>
                )}
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
                    <p className="text-xs text-hud-ink uppercase">
                        {detail[open].title}
                    </p>
                    <Breakdown lines={detail[open].total.lines} />
                </div>
            )}
        </div>
    );
}
