'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { BUILTIN_SOUNDS } from '@/lib/constants/soundboard';
import { useSoundMutations } from '@/lib/hooks/soundboard';
import { useTranslator } from '@/lib/i18n/use-translator';

export function HiddenBuiltinSounds({
    campaignId,
    hiddenBuiltin,
}: {
    campaignId: string;
    hiddenBuiltin: string[];
}) {
    const t = useTranslations();

    const tr = useTranslator();

    const { hide } = useSoundMutations(campaignId);

    const hidden = BUILTIN_SOUNDS.filter((s) => hiddenBuiltin.includes(s.id));

    if (!hidden.length) return null;

    return (
        <div className="flex flex-col gap-1 border-t border-hud-rule pt-2">
            <span className="text-xs text-hud-muted">
                {t('soundboard.edit.hiddenTitle')}
            </span>
            {hidden.map((sound) => (
                <div
                    key={sound.id}
                    className="flex items-center justify-between gap-2 text-xs text-hud-ink"
                >
                    <span className="min-w-0 truncate">
                        {tr(sound.nameKey)}
                    </span>
                    <HudButton
                        className="shrink-0 text-hud-muted hover:text-hud-ink"
                        onClick={() =>
                            void hide.mutateOk(
                                hiddenBuiltin.filter((id) => id !== sound.id)
                            )
                        }
                    >
                        {t('soundboard.edit.show')}
                    </HudButton>
                </div>
            ))}
        </div>
    );
}
