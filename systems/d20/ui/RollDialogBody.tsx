'use client';

import { useTranslations } from 'next-intl';

import { RollResultView } from '@/components/character-profile/RollResultView';
import type { RollDialogBodyProps } from '@/components/systems/types';
import { signed } from '@/lib/utils/common/format';

export function RollDialogBody({ result }: RollDialogBodyProps) {
    const t = useTranslations('rest');

    if (result?.kind !== 'check') return null;

    return (
        <RollResultView
            total={result.autoFail ? '✕' : result.total}
            detail={
                result.autoFail
                    ? t('sheetRoll.autoFail')
                    : t('sheetRoll.result', {
                          rolls: result.rolls.join(' / '),
                          mode: result.mode,
                          bonus: signed(result.mod + result.bonus),
                      })
            }
        />
    );
}
