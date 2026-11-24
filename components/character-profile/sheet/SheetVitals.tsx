'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Breakdown } from '../combat/Breakdown';
import { useProfile } from '../ProfileContext';

import { HudButton } from '@/components/hud';
import { systemUiOf } from '@/components/systems';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useEditResources } from '@/lib/hooks/characters';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { applyHpChange, type HpChange } from '@/lib/utils/characters/hp';

const FORM_ID = 'sheet-vitals-form';

const ACTION =
    'hud-sc min-h-10 min-w-24 flex-1 cursor-pointer rounded-xl border border-hud-line bg-hud-surface px-3 text-sm text-hud-ink hover:border-hud-gold';

const KINDS = ['damage', 'heal', 'temp'] as const;

export function SheetVitals() {
    const { campaignId, sheet } = useProfile();

    const t = useTranslations('characterProfile.hero');

    const tv = useTranslations('characterProfile.hero.vitals');

    const { system: current } = useCampaignSystem(campaignId, sheet.system);

    const Ui = systemUiOf(current.key, current.modules);

    const [open, setOpen] = useState(false);

    const [kind, setKind] = useState<HpChange['kind'] | null>(null);

    const hp = sheet.rest?.hp;

    const keys = Ui.hideProgression
        ? ({ current: 'woundsCurrent', total: 'woundsTotal' } as const)
        : ({ current: 'hpCurrent', total: 'hpTotal' } as const);

    const canChange = sheet.viewer.isDM && !!hp;

    return (
        <section className="flex flex-col gap-2 rounded-xl border border-hud-line bg-hud-panel p-3">
            <HudButton
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="flex min-h-10 flex-wrap items-baseline gap-x-2 text-left text-lg text-hud-ink"
            >
                {hp
                    ? t(keys.current, { current: hp.current, max: hp.max })
                    : t(keys.total, { total: sheet.hp.total })}
                {!!hp?.temp && (
                    <span className="text-sm text-hud-info">
                        {tv('tempBadge', { temp: hp.temp })}
                    </span>
                )}
            </HudButton>
            {hp && (
                <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={hp.max}
                    aria-valuenow={hp.current}
                    className="h-2 overflow-hidden rounded-full bg-hud-field"
                >
                    <div
                        className="h-full rounded-full bg-hud-danger"
                        style={{
                            width: `${hp.max > 0 ? Math.min(100, (hp.current / hp.max) * 100) : 0}%`,
                        }}
                    />
                </div>
            )}
            {canChange && (
                <div className="flex flex-wrap gap-2">
                    {KINDS.map((k) => (
                        <HudButton
                            key={k}
                            type="button"
                            className={ACTION}
                            onClick={() => setKind(k)}
                        >
                            {tv(k)}
                        </HudButton>
                    ))}
                </div>
            )}
            {open && <Breakdown lines={sheet.hp.lines} />}
            {canChange && hp && (
                <HpChangeDialog
                    hp={hp}
                    kind={kind}
                    onClose={() => setKind(null)}
                />
            )}
        </section>
    );
}

function HpChangeDialog({
    hp,
    kind,
    onClose,
}: {
    hp: { current: number; max: number; temp: number };
    kind: HpChange['kind'] | null;
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
        if (!kind || !amount || amount < 1) return;

        void edit
            .mutateOk(
                applyHpChange(
                    { hp: hp.current, max: hp.max, temp: hp.temp },
                    { kind, amount }
                )
            )
            .then((ok) => ok && close());
    };

    return (
        <ResponsiveDialog
            hud
            size="sm"
            open={kind !== null}
            onOpenChange={(o) => !o && close()}
            title={kind ? tv(kind) : ''}
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
