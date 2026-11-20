'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useFateReaction } from '@/systems/wfrp/hooks/useFateReaction';

type Reaction = ReturnType<typeof useFateReaction>;

export function FateReactionDialog() {
    const reaction = useFateReaction();

    return reaction.open ? <FateReactionForm reaction={reaction} /> : null;
}

// separate so the picks reset when the dialog closes
function FateReactionForm({
    reaction: { rows, answer, isSubmitting },
}: {
    reaction: Reaction;
}) {
    const t = useTranslations('battleWfrp.ui.fateReaction');

    const tCommon = useTranslations('common.confirm');

    const [spend, setSpend] = useState<Record<string, boolean>>({});

    return (
        <ResponsiveDialog
            open
            onOpenChange={() => undefined}
            dismissible={false}
            hud
            title={t('title')}
            footer={
                <Button
                    disabled={isSubmitting}
                    onClick={() =>
                        answer(
                            Object.fromEntries(
                                rows.map((r) => [r.key, !!spend[r.key]])
                            )
                        )
                    }
                >
                    {tCommon('confirm')}
                </Button>
            }
        >
            <div className="flex flex-col gap-4">
                {rows.map((r) => (
                    <div key={r.key} className="flex flex-col gap-2">
                        <p>
                            {t('body', {
                                attacker: r.attackerName,
                                name: r.holderName,
                            })}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant={spend[r.key] ? 'outline' : 'default'}
                                onClick={() =>
                                    setSpend((s) => ({ ...s, [r.key]: false }))
                                }
                            >
                                {t('accept')}
                            </Button>
                            <Button
                                variant={spend[r.key] ? 'default' : 'outline'}
                                onClick={() =>
                                    setSpend((s) => ({ ...s, [r.key]: true }))
                                }
                            >
                                {t('spend')}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </ResponsiveDialog>
    );
}
