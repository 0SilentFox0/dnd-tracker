'use client';

import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

import { useSceneSlot } from '@/components/battle/scene/layout/SceneSlots';
import { ReactionSpellButton } from '@/components/battle/turn/ReactionSpellButton';
import { ReadiedAttackButton } from '@/components/battle/turn/ReadiedAttackButton';
import type { BattleParticipant } from '@/types/battle';

export function HeroExtras({ hero }: { hero: BattleParticipant }) {
    const t = useTranslations('battle.hero');

    const slot = useSceneSlot('dock');

    if (!slot) return null;

    return createPortal(
        <div className="flex flex-col items-stretch empty:hidden [&>*]:mt-1">
            {hero.battleData.pendingCast && (
                <p className="text-sm text-[#e6dccb] [text-shadow:0_1px_3px_#000]">
                    {t('pendingCast', {
                        spell: hero.battleData.pendingCast.spellName,
                        rounds: hero.battleData.pendingCast.remainingRounds,
                    })}
                </p>
            )}
            <ReadiedAttackButton participant={hero} />
            <ReactionSpellButton participant={hero} />
        </div>,
        slot
    );
}
