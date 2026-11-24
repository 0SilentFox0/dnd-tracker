'use client';

import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

import { useSceneSlot } from '@/components/battle/scene/layout/SceneSlots';
import { HUD_GLASS } from '@/components/hud';

export function DockWaiting({ name }: { name: string }) {
    const t = useTranslations('battle.dock');

    const slot = useSceneSlot('dock');

    if (!slot) return null;

    return createPortal(
        <div
            role="status"
            className={`${HUD_GLASS} hud-sc pointer-events-auto rounded-xl px-4 py-2 text-[15px] tracking-[.08em] text-[var(--ink)]`}
        >
            {t('waiting', { name })}
        </div>,
        slot
    );
}
