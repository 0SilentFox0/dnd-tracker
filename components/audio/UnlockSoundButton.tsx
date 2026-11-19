'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { usePlayerAudio } from '@/lib/hooks/audio';
import { unlockSoundboard } from '@/lib/hooks/soundboard';
import { cn } from '@/lib/utils';

export function UnlockSoundButton({ className }: { className?: string }) {
    const t = useTranslations('music');

    const { sound } = usePlayerAudio();

    return (
        <HudButton
            type="button"
            className={cn(
                'hud-sc flex h-8 items-center justify-center bg-[var(--enemy,#9c2a1d)] text-sm text-[#fffaf0]',
                className
            )}
            onClick={() => {
                sound.unlock();
                void unlockSoundboard();
            }}
        >
            {t('player.unlock')}
        </HudButton>
    );
}
