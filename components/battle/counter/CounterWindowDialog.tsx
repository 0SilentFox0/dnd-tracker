'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { SelectField } from '@/components/ui/select-field';
import {
    type CounterOfferView,
    useCounterNudge,
    useCounterWindow,
} from '@/lib/hooks/battle';

type View = ReturnType<typeof useCounterWindow>;

export function CounterWindowDialog() {
    const view = useCounterWindow();

    useCounterNudge();

    return view.offers.length > 0 ? <CounterForm view={view} /> : null;
}

function OfferRow({ row, view }: { row: CounterOfferView; view: View }) {
    const t = useTranslations('battle.counterWindow');

    const { offer, name, canCounter, passForPlayer } = row;

    const [level, setLevel] = useState(String(offer.slotLevels[0] ?? ''));

    return (
        <li className="space-y-2 rounded border border-white/15 p-2">
            <div className="font-semibold">{name}</div>
            {canCounter && offer.slotLevels.length > 0 && (
                <SelectField
                    aria-label={t('slot')}
                    value={level}
                    onValueChange={setLevel}
                    options={offer.slotLevels.map((l) => ({
                        value: String(l),
                        label: t('slotLevel', { level: l }),
                    }))}
                />
            )}
            {canCounter && offer.slotLevels.length === 0 && (
                <div className="text-sm text-[var(--hud-muted)]">
                    {t('grant')}
                </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
                <Button
                    variant="ghost"
                    disabled={view.isPending}
                    onClick={() => view.pass(offer)}
                >
                    {passForPlayer ? t('passForPlayer') : t('pass')}
                </Button>
                {canCounter && (
                    <Button
                        disabled={view.isPending}
                        onClick={() =>
                            view.counter(
                                offer,
                                level === '' ? undefined : Number(level)
                            )
                        }
                    >
                        {t('counter')}
                    </Button>
                )}
            </div>
        </li>
    );
}

function CounterForm({ view }: { view: View }) {
    const t = useTranslations('battle.counterWindow');

    const { window, caster, secondsLeft, offers } = view;

    if (!window) return null;

    return (
        <ResponsiveDialog
            open
            onOpenChange={() => undefined}
            dismissible={false}
            hud
            title={t('title')}
            description={
                window.spell
                    ? t('descriptionSpell', {
                          caster,
                          spell: window.spell.name,
                      })
                    : t('description', { caster })
            }
            footer={
                view.isDM && (
                    <Button
                        variant="outline"
                        disabled={view.isPending}
                        onClick={view.closeAll}
                    >
                        {t('closeAll')}
                    </Button>
                )
            }
        >
            <div className="space-y-3 py-2">
                <div className="text-center text-2xl font-bold tabular-nums">
                    {secondsLeft}
                </div>
                <ul className="space-y-2">
                    {offers.map((row) => (
                        <OfferRow
                            key={row.offer.reactorId}
                            row={row}
                            view={view}
                        />
                    ))}
                </ul>
            </div>
        </ResponsiveDialog>
    );
}
