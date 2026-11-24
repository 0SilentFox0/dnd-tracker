'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield } from 'lucide-react';

import { Breakdown } from '../combat/Breakdown';
import { useProfile } from '../ProfileContext';
import { ScaleFill } from './SheetBar';

import { HudButton } from '@/components/hud';
import { HudPanel } from '@/components/hud/page';
import { systemUiOf } from '@/components/systems';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useEditResources } from '@/lib/hooks/characters';
import { useCountUp, useGhostValue } from '@/lib/hooks/common';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { cn } from '@/lib/utils';
import { applyHpChange } from '@/lib/utils/characters/hp';

const FORM_ID = 'sheet-vitals-form';

type Hp = { current: number; max: number; temp: number };

const STEP =
    'motion-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-hud-rule bg-transparent text-lg text-hud-ink hover:bg-hud-raised focus-visible:ring-2 focus-visible:ring-hud-gold focus-visible:outline-none disabled:opacity-50';

const NUM = 'text-5xl leading-none font-bold tabular-nums lg:text-[56px]';

export function SheetVitals() {
    const { campaignId, sheet } = useProfile();

    const t = useTranslations('characterProfile.hero');

    const tv = useTranslations('characterProfile.hero.vitals');

    const { system: current } = useCampaignSystem(campaignId, sheet.system);

    const Ui = systemUiOf(current.key, current.modules);

    const [open, setOpen] = useState(false);

    const hp = sheet.rest?.hp;

    const keys = Ui.hideProgression
        ? ({ current: 'woundsCurrent', total: 'woundsTotal' } as const)
        : ({ current: 'hpCurrent', total: 'hpTotal' } as const);

    const summary = hp
        ? t(keys.current, { current: hp.current, max: hp.max })
        : t(keys.total, { total: sheet.hp.total });

    return (
        <HudPanel className="motion-rise flex flex-col gap-4 p-5 backdrop-blur-sm sm:p-5">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-medium tracking-[.08em] text-hud-muted uppercase">
                    {Ui.hideProgression ? t('wounds') : tv('hp')}
                </h2>
                {!!hp?.temp && (
                    <span className="text-sm text-hud-muted">
                        {tv('tempBadge', { temp: hp.temp })}
                    </span>
                )}
            </div>
            {hp ? (
                <HpReadout
                    hp={hp}
                    summary={summary}
                    open={open}
                    onToggle={() => setOpen((v) => !v)}
                />
            ) : (
                <HudButton
                    type="button"
                    aria-label={summary}
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                    className={cn('min-h-10 text-left text-hud-ink', NUM)}
                >
                    {sheet.hp.total}
                </HudButton>
            )}
            {sheet.viewer.isDM && hp && <HpControls hp={hp} />}
            {open && <Breakdown lines={sheet.hp.lines} />}
        </HudPanel>
    );
}

function HpReadout({
    hp,
    summary,
    open,
    onToggle,
}: {
    hp: Hp;
    summary: string;
    open: boolean;
    onToggle: () => void;
}) {
    const shown = useCountUp(hp.current);

    const { ghost, flash } = useGhostValue(hp.current);

    const ratio = (n: number) => (hp.max > 0 ? n / hp.max : 0);

    return (
        <>
            <HudButton
                type="button"
                aria-label={summary}
                aria-expanded={open}
                onClick={onToggle}
                className="flex min-h-10 items-baseline gap-2 text-left text-hud-ink focus-visible:ring-2 focus-visible:ring-hud-gold focus-visible:outline-none"
            >
                <span
                    className={cn('motion-flash inline-block', NUM)}
                    data-flash={flash ?? undefined}
                >
                    {shown}
                </span>
                <span className="text-[22px] font-medium text-hud-muted tabular-nums">
                    / {hp.max}
                </span>
            </HudButton>
            <div
                role="progressbar"
                aria-label={summary}
                aria-valuemin={0}
                aria-valuemax={hp.max}
                aria-valuenow={hp.current}
                className="relative h-2.5 overflow-hidden rounded-full bg-(--sheet-hp-track)"
            >
                <ScaleFill
                    ratio={ratio(ghost)}
                    className="bg-(--sheet-hp-ghost)"
                />
                <ScaleFill
                    ratio={ratio(hp.current)}
                    className="bg-(--sheet-hp)"
                />
                {hp.temp > 0 && (
                    <div
                        aria-hidden
                        className="absolute inset-y-0 right-0 rounded-full bg-[repeating-linear-gradient(135deg,var(--sheet-hp-temp)_0_3px,transparent_3px_6px)] shadow-[inset_0_0_0_1px_var(--sheet-hp-temp)]"
                        style={{
                            width: `${Math.min(100, ratio(hp.temp) * 100)}%`,
                        }}
                    />
                )}
            </div>
        </>
    );
}

function HpControls({ hp }: { hp: Hp }) {
    const { campaignId, characterId } = useProfile();

    const tv = useTranslations('characterProfile.hero.vitals');

    const edit = useEditResources(campaignId, characterId);

    const [amount, setAmount] = useState<number | undefined>(1);

    const [tempOpen, setTempOpen] = useState(false);

    const valid = !!amount && amount >= 1;

    const change = (kind: 'damage' | 'heal') => {
        if (!amount || amount < 1) return;

        void edit.mutateOk(
            applyHpChange(
                { hp: hp.current, max: hp.max, temp: hp.temp },
                { kind, amount }
            )
        );
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <HudButton
                type="button"
                aria-label={tv('damage')}
                disabled={edit.isPending || !valid}
                className={STEP}
                onClick={() => change('damage')}
            >
                −
            </HudButton>
            <NumberInput
                aria-label={tv('amount')}
                min={1}
                value={amount}
                onChange={setAmount}
                className="h-10 w-16 text-center text-[17px] font-bold"
            />
            <HudButton
                type="button"
                aria-label={tv('heal')}
                disabled={edit.isPending || !valid}
                className={STEP}
                onClick={() => change('heal')}
            >
                +
            </HudButton>
            <HudButton
                type="button"
                className="motion-press ml-auto inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[10px] px-2 text-[15px] text-hud-muted hover:text-hud-ink focus-visible:ring-2 focus-visible:ring-hud-gold focus-visible:outline-none"
                onClick={() => setTempOpen(true)}
            >
                <Shield aria-hidden className="size-4" />
                {tv('temp')}
            </HudButton>
            <TempHpDialog
                hp={hp}
                open={tempOpen}
                onClose={() => setTempOpen(false)}
            />
        </div>
    );
}

function TempHpDialog({
    hp,
    open,
    onClose,
}: {
    hp: Hp;
    open: boolean;
    onClose: () => void;
}) {
    const { campaignId, characterId } = useProfile();

    const tv = useTranslations('characterProfile.hero.vitals');

    const edit = useEditResources(campaignId, characterId);

    const [amount, setAmount] = useState<number | undefined>();

    const close = () => {
        setAmount(undefined);
        onClose();
    };

    const apply = () => {
        if (!amount || amount < 1) return;

        void edit
            .mutateOk(
                applyHpChange(
                    { hp: hp.current, max: hp.max, temp: hp.temp },
                    { kind: 'temp', amount }
                )
            )
            .then((ok) => ok && close());
    };

    return (
        <ResponsiveDialog
            hud
            size="sm"
            open={open}
            onOpenChange={(o) => !o && close()}
            title={tv('temp')}
            footer={
                <Button
                    type="submit"
                    form={FORM_ID}
                    disabled={edit.isPending || !amount || amount < 1}
                >
                    {tv('apply')}
                </Button>
            }
        >
            <form
                id={FORM_ID}
                onSubmit={(e) => {
                    e.preventDefault();
                    apply();
                }}
            >
                <Label htmlFor="vitals-amount">{tv('amount')}</Label>
                <NumberInput
                    id="vitals-amount"
                    min={1}
                    autoFocus
                    value={amount}
                    onChange={setAmount}
                />
            </form>
        </ResponsiveDialog>
    );
}
