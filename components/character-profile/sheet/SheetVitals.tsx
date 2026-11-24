'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, Minus, Plus, Shield } from 'lucide-react';

import { Breakdown } from '../combat/Breakdown';
import { useProfile } from '../ProfileContext';
import { ScaleFill } from './SheetBar';

import { HudButton } from '@/components/hud';
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

const BTN =
    'motion-press inline-flex min-h-11 min-w-fit flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-hud-line bg-hud-raised px-3 text-[15px] font-medium whitespace-nowrap text-hud-ink hover:border-hud-muted focus-visible:ring-2 focus-visible:ring-hud-gold focus-visible:outline-none disabled:opacity-50';

const LABEL =
    'hud-title flex items-center gap-2 text-base text-hud-muted lg:text-[17px]';

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
        <div className="motion-rise col-span-full flex flex-col gap-2.5 border-b border-hud-rule p-4 lg:col-span-1 lg:border-b-0 lg:px-5">
            <div className="flex items-center justify-between gap-2">
                <h2 className={LABEL}>
                    <Heart aria-hidden className="size-5 text-hud-danger" />
                    {Ui.hideProgression ? t('wounds') : tv('hp')}
                </h2>
                {!!hp?.temp && (
                    <span className="ml-auto text-[15px] whitespace-nowrap text-hud-muted">
                        {tv('tempBadge', { temp: hp.temp })}
                    </span>
                )}
                {sheet.viewer.isDM && hp && <TempButton hp={hp} />}
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
                    className="hud-num min-h-11 text-left text-[46px] leading-none text-hud-ink"
                >
                    {sheet.hp.total}
                </HudButton>
            )}
            {sheet.viewer.isDM && hp && <HpControls hp={hp} />}
            {open && <Breakdown lines={sheet.hp.lines} />}
        </div>
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
        <div className="relative h-[42px]">
            <div
                role="progressbar"
                aria-label={summary}
                aria-valuemin={0}
                aria-valuemax={hp.max}
                aria-valuenow={hp.current}
                className="absolute inset-0 overflow-hidden rounded-[4px] bg-(--sheet-hp-track) p-[3px] shadow-[0_0_0_1px_var(--color-hud-line)]"
            >
                <div className="relative size-full overflow-hidden rounded-[2px]">
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
                            className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,var(--sheet-hp-temp)_0_3px,transparent_3px_6px)] shadow-[inset_0_0_0_1px_var(--sheet-hp-temp)]"
                            style={{
                                width: `${Math.min(100, ratio(hp.temp) * 100)}%`,
                            }}
                        />
                    )}
                </div>
            </div>
            <HudButton
                type="button"
                aria-label={summary}
                aria-expanded={open}
                onClick={onToggle}
                className="hud-num absolute inset-0 flex items-center gap-1.5 px-4 text-left text-white [text-shadow:0_1px_2px_rgba(0,0,0,.55)] focus-visible:ring-2 focus-visible:ring-hud-gold focus-visible:outline-none"
            >
                <span
                    className="motion-flash inline-block text-[27px] leading-none"
                    data-flash={flash ?? undefined}
                >
                    {shown}
                </span>
                <span className="pt-1.5 text-lg leading-none opacity-80">
                    / {hp.max}
                </span>
            </HudButton>
        </div>
    );
}

function HpControls({ hp }: { hp: Hp }) {
    const { campaignId, characterId } = useProfile();

    const tv = useTranslations('characterProfile.hero.vitals');

    const edit = useEditResources(campaignId, characterId);

    const [amount, setAmount] = useState<number | undefined>(1);

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
        <div className="flex items-center gap-1.5 max-sm:flex-wrap">
            <NumberInput
                aria-label={tv('amount')}
                min={1}
                value={amount}
                onChange={setAmount}
                className="hud-num h-11 w-16 rounded-[4px] text-center text-xl"
            />
            <HudButton
                type="button"
                aria-label={tv('damage')}
                disabled={edit.isPending || !valid}
                className={BTN}
                onClick={() => change('damage')}
            >
                <Minus aria-hidden className="size-4 text-hud-danger" />
                {tv('damage')}
            </HudButton>
            <HudButton
                type="button"
                aria-label={tv('heal')}
                disabled={edit.isPending || !valid}
                className={BTN}
                onClick={() => change('heal')}
            >
                <Plus aria-hidden className="size-4" />
                {tv('heal')}
            </HudButton>
        </div>
    );
}

function TempButton({ hp }: { hp: Hp }) {
    const tv = useTranslations('characterProfile.hero.vitals');

    const [tempOpen, setTempOpen] = useState(false);

    return (
        <>
            <HudButton
                type="button"
                aria-label={tv('temp')}
                className={cn(
                    'motion-press inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-1 rounded-[4px] border border-hud-line px-2 text-[15px] text-hud-muted hover:text-hud-ink focus-visible:ring-2 focus-visible:ring-hud-gold focus-visible:outline-none',
                    !hp.temp && 'ml-auto'
                )}
                onClick={() => setTempOpen(true)}
            >
                <Shield aria-hidden className="size-4" />
                <Plus aria-hidden className="size-4" />
            </HudButton>
            <TempHpDialog
                hp={hp}
                open={tempOpen}
                onClose={() => setTempOpen(false)}
            />
        </>
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
