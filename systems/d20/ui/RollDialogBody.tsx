'use client';

import { useTranslations } from 'next-intl';

import { RollResultView } from '@/components/character-profile/combat/RollResultView';
import type { RollDialogBodyProps } from '@/components/systems/types';
import { Checkbox } from '@/components/ui/checkbox';
import { signed } from '@/lib/utils/common/format';

export function RollDialogBody({
    request,
    result,
    extra,
    setExtra,
}: RollDialogBodyProps) {
    const t = useTranslations('rest');

    const td = useTranslations('characterProfile.damageRoll');

    if (result?.kind === 'damage')
        return (
            <RollResultView
                accent={
                    result.crit
                        ? { tone: 'crit', label: td('critLabel') }
                        : undefined
                }
                total={result.total}
                detail={td('detail', {
                    dice: result.dice.map((d) => d.value).join(' + '),
                    flat: signed(result.flat),
                })}
            />
        );

    if (!result && request.subject.kind === 'damage')
        return (
            <label className="flex items-center gap-2 text-sm">
                <Checkbox
                    checked={!!extra.critical}
                    onCheckedChange={(v) =>
                        setExtra({ ...extra, critical: v === true })
                    }
                />
                {td('crit')}
            </label>
        );

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
