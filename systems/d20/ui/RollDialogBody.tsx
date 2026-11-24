'use client';

import { useTranslations } from 'next-intl';

import { RollResultView } from '@/components/character-profile/combat/RollResultView';
import type { RollDialogBodyProps } from '@/components/systems/types';
import { signed } from '@/lib/utils/common/format';

export function RollDialogBody({ result }: RollDialogBodyProps) {
    const t = useTranslations('rest');

    if (result?.kind !== 'check') return null;

    const accent = result.autoFail
        ? undefined
        : result.roll === 20
          ? { tone: 'crit' as const, label: t('sheetRoll.nat20') }
          : result.roll === 1
            ? { tone: 'fumble' as const, label: t('sheetRoll.nat1') }
            : undefined;

    return (
        <RollResultView
            accent={accent}
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
