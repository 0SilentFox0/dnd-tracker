import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { useMechanicText } from './mechanic-text';
import { useRulesChanges } from './RulesChanges';

import { HudPill } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import type { MECHANIC_REGISTRY } from '@/lib/utils/rules';

export function RulesSection({
    mechanic,
    children,
}: {
    mechanic: keyof typeof MECHANIC_REGISTRY;
    children: ReactNode;
}) {
    const text = useMechanicText();

    const t = useTranslations('rules.page');

    const changes = useRulesChanges();

    const changed = changes?.dirty.has(mechanic);

    return (
        <section className="mt-5 first:mt-0">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <h2 className="hud-sc text-2xl text-hud-ink">
                    {text(mechanic, 'label')}
                </h2>
                {changed && (
                    <span className="flex items-center gap-2">
                        <HudPill>{t('changed')}</HudPill>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="lg:hidden"
                            onClick={() => changes?.reset(mechanic)}
                        >
                            {t('resetSection')}
                        </Button>
                    </span>
                )}
            </div>
            <p className="mb-3 text-sm text-hud-muted">
                {text(mechanic, 'description')}
            </p>
            <div className="ds-panel ds-setting-rows px-4">{children}</div>
        </section>
    );
}
