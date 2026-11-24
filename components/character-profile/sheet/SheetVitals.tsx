'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield } from 'lucide-react';

import { Breakdown } from '../combat/Breakdown';
import { useProfile } from '../ProfileContext';

import { HudButton } from '@/components/hud';
import { HudPanel, HudPill } from '@/components/hud/page';
import { systemUiOf } from '@/components/systems';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useEditResources } from '@/lib/hooks/characters';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { applyHpChange } from '@/lib/utils/characters/hp';

const FORM_ID = 'sheet-vitals-form';

type Hp = { current: number; max: number; temp: number };

const STEP =
    'hud-sc size-11 shrink-0 cursor-pointer rounded-xl border border-hud-rule bg-hud-surface/60 text-xl text-hud-ink hover:border-hud-gold disabled:opacity-50';

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
        <HudPanel className="flex flex-col gap-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
                <h2 className="hud-sc text-[13px] tracking-[.12em] text-hud-muted uppercase">
                    {Ui.hideProgression ? t('wounds') : tv('hp')}
                </h2>
                {!!hp?.temp && (
                    <HudPill tone="accent" className="text-xs">
                        {tv('tempBadge', { temp: hp.temp })}
                    </HudPill>
                )}
            </div>
            <HudButton
                type="button"
                aria-label={summary}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="flex min-h-10 items-baseline gap-2 text-left text-hud-ink"
            >
                <span className="hud-sc text-4xl leading-none tabular-nums lg:text-5xl">
                    {hp ? hp.current : sheet.hp.total}
                </span>
                {hp && (
                    <span className="text-xl text-hud-muted tabular-nums">
                        / {hp.max}
                    </span>
                )}
            </HudButton>
            {hp && (
                <div
                    role="progressbar"
                    aria-label={summary}
                    aria-valuemin={0}
                    aria-valuemax={hp.max}
                    aria-valuenow={hp.current}
                    className="h-2.5 overflow-hidden rounded-full bg-hud-field"
                >
                    <div
                        className="h-full rounded-full bg-hud-danger"
                        style={{
                            width: `${hp.max > 0 ? Math.min(100, (hp.current / hp.max) * 100) : 0}%`,
                        }}
                    />
                </div>
            )}
            {sheet.viewer.isDM && hp && <HpControls hp={hp} />}
            {open && <Breakdown lines={sheet.hp.lines} />}
        </HudPanel>
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
                className="h-11 w-16 text-center text-lg"
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
                className="hud-sc ml-auto inline-flex min-h-10 cursor-pointer items-center gap-1.5 px-2 text-sm text-hud-muted hover:text-hud-gold"
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
