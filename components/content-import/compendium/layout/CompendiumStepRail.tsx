'use client';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import { COMPENDIUM_STEP_KEYS } from '../CompendiumSteps';

import { Button } from '@/components/ui/button';
import type {
    CompendiumImportController,
    CompendiumStepId,
    CompendiumWizardView,
} from '@/lib/hooks/compendium-import';
import { cn } from '@/lib/utils';

function available(
    id: number,
    { root, preview, result }: CompendiumImportController['state']
) {
    if (id === 1) return true;

    if (id === 2) return !!root;

    if (id === 5) return !!result;

    return !!preview;
}

export function CompendiumStepRail({
    wizard,
    view,
    details,
}: {
    wizard: CompendiumImportController;
    view: CompendiumWizardView;
    details: Partial<Record<CompendiumStepId, string>>;
}) {
    const t = useTranslations('compendium');

    return (
        <ol
            aria-label={t('import.steps.label')}
            className="hud-scroll-x flex gap-2 overflow-x-auto @6xl:flex-col"
        >
            {COMPENDIUM_STEP_KEYS.map((key, index) => {
                const id = (index + 1) as CompendiumStepId;

                const active = id === view.step;

                const done = id < view.step;

                const enabled =
                    id <= view.maxStep && available(id, wizard.state);

                return (
                    <li key={key} className="shrink-0 @6xl:shrink">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={!enabled}
                            aria-current={active ? 'step' : undefined}
                            data-state={
                                done ? 'done' : active ? 'current' : 'todo'
                            }
                            onClick={() => view.setStep(id)}
                            className={cn(
                                'h-auto w-full justify-start gap-2 rounded-lg px-3 py-2 text-left whitespace-normal',
                                active
                                    ? 'bg-hud-panel-2 text-hud-accent-fg'
                                    : 'text-hud-muted hover:bg-hud-raised'
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-5 shrink-0 items-center justify-center rounded-full border text-xs',
                                    active
                                        ? 'border-hud-accent'
                                        : 'border-hud-rule'
                                )}
                            >
                                {done ? (
                                    <Check className="size-3" aria-hidden />
                                ) : (
                                    id
                                )}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm">
                                    {key === 'result'
                                        ? t('result.title')
                                        : t(`import.steps.${key}`)}
                                </span>
                                {details[id] && (
                                    <span className="hidden truncate text-xs text-hud-muted @6xl:block">
                                        {details[id]}
                                    </span>
                                )}
                            </span>
                        </Button>
                    </li>
                );
            })}
        </ol>
    );
}
