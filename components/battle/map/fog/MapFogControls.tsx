'use client';

import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';
import { SelectField } from '@/components/ui/select-field';
import { CONTROLLED_BY_DM } from '@/lib/constants/characters';
import type { useBattleMapFog } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import type { BattleParticipant } from '@/types/battle';

const CHIP =
    'flex min-w-0 items-center gap-1 rounded-md border border-hud-rule bg-black/70 px-2 py-1 text-hud-muted';

export function MapFogControls({
    fog,
    participants,
    isDM,
    phone,
}: {
    fog: ReturnType<typeof useBattleMapFog>;
    participants: BattleParticipant[];
    isDM: boolean;
    phone: boolean;
}) {
    const t = useTranslations('battle.map.fog');

    const previewable = participants
        .filter(
            (participant) =>
                !participant.battleData.reserved &&
                participant.basicInfo.controlledBy !== CONTROLLED_BY_DM
        )
        .map((participant) => ({
            value: participant.basicInfo.id,
            label: participant.basicInfo.name,
        }));

    return (
        <div
            className={cn(
                'z-20 flex max-w-full flex-wrap items-center gap-1.5 text-xs',
                phone ? 'shrink-0 px-1 pb-1' : 'absolute top-14 right-2'
            )}
        >
            {isDM && (
                <div className={CHIP}>
                    {t('preview')}
                    <SelectField
                        aria-label={t('preview')}
                        value={fog.preview.participantId}
                        onValueChange={fog.preview.setParticipantId}
                        options={previewable}
                        allowNone
                        noneLabel={t('dmView')}
                        triggerClassName="h-7 max-w-40 text-xs"
                    />
                </div>
            )}
            {fog.showRemember && (
                <label className={CHIP}>
                    <Checkbox
                        checked={fog.memory.remember}
                        onCheckedChange={(checked) =>
                            fog.memory.set(checked === true)
                        }
                    />
                    {t('remember')}
                </label>
            )}
            {fog.mode === 'vision' && (
                <label className={CHIP}>
                    <Checkbox
                        checked={fog.share.on}
                        onCheckedChange={(checked) =>
                            fog.share.set(checked === true)
                        }
                    />
                    {t('shareAllies')}
                </label>
            )}
        </div>
    );
}
