'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useRiderChoiceDialog } from '@/systems/d20/hooks/battle/useRiderChoiceDialog';
import { RiderRows } from '@/systems/d20/ui/battle/rider-choice/RiderRows';

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
    const t = useTranslations('battleD20.riderChoice');

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
            <RiderRows rows={rows} spend={spend} onChange={setSpend} />
        </ResponsiveDialog>
    );
}
