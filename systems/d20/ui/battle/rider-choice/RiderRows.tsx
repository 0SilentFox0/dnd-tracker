'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { RiderChoiceRow } from '@/systems/d20/hooks/battle/useRiderChoiceDialog';

export function RiderRows({
    rows,
    spend,
    onChange,
}: {
    rows: RiderChoiceRow[];
    spend: Record<string, boolean>;
    onChange: (spend: Record<string, boolean>) => void;
}) {
    const t = useTranslations('battle.riderChoice');

    return (
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
                            type="button"
                            size="sm"
                            variant={spend[offer.key] ? 'default' : 'outline'}
                            onClick={() =>
                                onChange({ ...spend, [offer.key]: true })
                            }
                        >
                            {t('spend', { die: offer.die })}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={spend[offer.key] ? 'outline' : 'default'}
                            onClick={() =>
                                onChange({ ...spend, [offer.key]: false })
                            }
                        >
                            {t('keep')}
                        </Button>
                    </span>
                </li>
            ))}
        </ul>
    );
}
