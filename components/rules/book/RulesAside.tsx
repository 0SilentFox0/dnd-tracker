import { useTranslations } from 'next-intl';

import { HudPill } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { ruleSystemLabelKey } from '@/lib/i18n/system-scope';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    composition,
    type SystemSelection,
} from '@/lib/utils/rules/systems/catalog';

export function CompositionChip({ system }: { system: SystemSelection }) {
    const tTerms = useTranslator('gameTerms');

    const { base, modules } = composition(system);

    return (
        <HudPill tone="gold">
            {[
                tTerms(ruleSystemLabelKey(base)),
                ...modules.map((id) => `+${tTerms(`module.${id}.name`)}`),
            ].join(' · ')}
        </HudPill>
    );
}

export function RulesAside({
    system,
    changed,
    actions,
}: {
    system: SystemSelection;
    changed: { key: string; label: string }[];
    actions?: { select: (key: string) => void; reset: (key: string) => void };
}) {
    const t = useTranslations('rules');

    return (
        <div className="ds-panel space-y-4 p-4">
            <section className="space-y-2">
                <h2 className="hud-sc text-lg text-hud-ink">
                    {t('page.aside.composition')}
                </h2>
                <CompositionChip system={system} />
                {actions && (
                    <div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => actions.select('system')}
                        >
                            {t('page.changeSystem')}
                        </Button>
                    </div>
                )}
            </section>
            {changed.length > 0 && (
                <section className="space-y-2">
                    <h2 className="hud-sc text-lg text-hud-ink">
                        {t('page.aside.changed')}
                    </h2>
                    <ul className="space-y-1">
                        {changed.map((item) => (
                            <li
                                key={item.key}
                                className="flex items-center justify-between gap-2 text-sm text-hud-bone"
                            >
                                <span>{item.label}</span>
                                {actions && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => actions.reset(item.key)}
                                    >
                                        {t('page.resetSection')}
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            <p className="text-xs text-hud-muted">{t('form.hint')}</p>
        </div>
    );
}
