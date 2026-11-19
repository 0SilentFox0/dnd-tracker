'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useRiderChoiceDialog } from '@/systems/d20/hooks/battle/useRiderChoiceDialog';

type Dialog = ReturnType<typeof useRiderChoiceDialog>;

export function RiderChoiceDialog() {
    const dialog = useRiderChoiceDialog();

    return dialog.open ? <RiderChoiceForm dialog={dialog} /> : null;
}

// separate so the choice resets when the dialog closes
function RiderChoiceForm({
    dialog: { rows, submit, isSubmitting },
}: {
    dialog: Dialog;
}) {
    const t = useTranslations('battle.riderChoice');

    const [spend, setSpend] = useState<Record<string, boolean>>({});

    return (
        <ResponsiveDialog
            open
            onOpenChange={() => undefined}
            dismissible={false}
            hud
            title={t('title')}
            description={t('description')}
            footer={
                <Button
                    disabled={isSubmitting}
                    onClick={() =>
                        submit(
                            Object.fromEntries(
                                rows.map((r) => [
                                    r.offer.key,
                                    !!spend[r.offer.key],
                                ])
                            )
                        )
                    }
                >
                    {t('confirm')}
                </Button>
            }
        >
            <ul className="space-y-3 py-2">
                {rows.map(({ offer, holderName }) => (
                    <li
                        key={offer.key}
                        className="flex items-center justify-between gap-2"
                    >
                        <span className="text-sm">
                            {t(`row.${offer.kind}`, {
                                name: holderName,
                                total: offer.total,
                            })}
                        </span>
                        <span className="flex gap-1">
                            <Button
                                size="sm"
                                variant={
                                    spend[offer.key] ? 'default' : 'outline'
                                }
                                onClick={() =>
                                    setSpend({ ...spend, [offer.key]: true })
                                }
                            >
                                {t('spend', { die: offer.die })}
                            </Button>
                            <Button
                                size="sm"
                                variant={
                                    spend[offer.key] ? 'outline' : 'default'
                                }
                                onClick={() =>
                                    setSpend({ ...spend, [offer.key]: false })
                                }
                            >
                                {t('keep')}
                            </Button>
                        </span>
                    </li>
                ))}
            </ul>
        </ResponsiveDialog>
    );
}
