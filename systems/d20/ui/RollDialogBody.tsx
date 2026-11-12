'use client';

import { useTranslations } from 'next-intl';

import type { RollDialogBodyProps } from '@/components/systems/types';
import { signed } from '@/lib/utils/common/format';

export function RollDialogBody({ result }: RollDialogBodyProps) {
    const t = useTranslations('rest');

    if (result?.kind !== 'd20') return null;

    return (
        <div aria-live="polite" className="text-center">
            <div className="text-4xl font-bold text-hud-gold-bright tabular-nums">
                {result.autoFail ? '✕' : result.total}
            </div>
            <div className="text-xs text-hud-muted">
                {result.autoFail
                    ? t('sheetRoll.autoFail')
                    : t('sheetRoll.result', {
                          rolls: result.rolls.join(' / '),
                          mode: result.mode,
                          bonus: signed(result.mod + result.bonus),
                      })}
            </div>
        </div>
    );
}
