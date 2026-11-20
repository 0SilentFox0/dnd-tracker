'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import type { HeroPanelProps } from '@/components/systems/types';
import { dynamicTextRef } from '@/lib/i18n/text-ref';
import { useText } from '@/lib/i18n/use-text';
import { usePsychologyPanel } from '@/systems/wfrp/hooks/usePsychologyPanel';

const btn =
    'h-9 w-full border border-white/25 px-2 text-left text-sm text-[var(--bone)] disabled:opacity-40';

export function PsychologyPanel({ hero }: HeroPanelProps) {
    const t = useTranslations('battleWfrp.ui.psychology');

    const text = useText();

    const panel = usePsychologyPanel(hero);

    if (!panel) return null;

    return (
        <div className="mt-2 space-y-1.5">
            <div className="text-xs text-hud-soft uppercase">{t('title')}</div>
            {panel.canFrenzy && (
                <HudButton
                    type="button"
                    disabled={panel.isPending}
                    className={btn}
                    onClick={panel.frenzy}
                >
                    {t('frenzy')}
                </HudButton>
            )}
            {panel.vent.map(({ key, group }) => (
                <HudButton
                    key={key}
                    type="button"
                    disabled={panel.isPending}
                    className={btn}
                    onClick={panel.ventAnimosity}
                >
                    {t('vent', { group })}
                </HudButton>
            ))}
            {panel.release.map(({ key, group, passion }) => (
                <HudButton
                    key={key}
                    type="button"
                    disabled={panel.isPending}
                    className={btn}
                    onClick={() => panel.releasePassion(key)}
                >
                    {t('release', {
                        group,
                        passion: text(
                            dynamicTextRef(`battleWfrp.passion.${passion}`)
                        ),
                    })}
                </HudButton>
            ))}
            {panel.intimidate.map(({ id, name }) => (
                <HudButton
                    key={id}
                    type="button"
                    disabled={panel.isPending}
                    className={btn}
                    onClick={() => panel.intimidateFoe(id)}
                >
                    {t('intimidate', { name })}
                </HudButton>
            ))}
        </div>
    );
}
