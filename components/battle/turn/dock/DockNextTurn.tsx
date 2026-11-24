'use client';

import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { useSceneSlot } from '@/components/battle/scene/layout/SceneSlots';
import { HudButton } from '@/components/hud';
import { actionIcon } from '@/components/hud/icons/battle';
import { BattleStatus } from '@/lib/constants/battle';
import { useBattleScene } from '@/lib/hooks/battle';

export function DockNextTurn() {
    const t = useTranslations('battle.topBar');

    const slot = useSceneSlot('dock');

    const {
        battle,
        viewer: { isDM, readOnly },
        actions,
    } = useBattleScene();

    if (!slot || !isDM || readOnly || battle.status !== BattleStatus.ACTIVE)
        return null;

    const pending = actions.nextTurn.isPending;

    const Icon = actionIcon.nextTurn;

    return createPortal(
        <HudButton
            type="button"
            data-tour="battle.next-turn"
            disabled={pending}
            onClick={() => actions.nextTurn.mutate({})}
            className="hud-sc pointer-events-auto mb-3 flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl border border-white/25 bg-black/70 px-4 text-[15px] tracking-[.08em] text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none disabled:opacity-70"
        >
            {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
                <Icon className="size-4" aria-hidden />
            )}
            {t('nextTurn')}
        </HudButton>,
        slot
    );
}
