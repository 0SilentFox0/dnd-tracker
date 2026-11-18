import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ModuleStep } from './ModuleStep';
import { SummaryStep } from './SummaryStep';

import { ErrorState, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import type { useCampaignModules } from '@/lib/hooks/campaigns';
import { useModuleDraft } from '@/lib/hooks/campaigns';
import type { SystemSelection } from '@/lib/utils/rules/systems/catalog';

type Step = 'modules' | 'summary';

export function ModuleWizard({
    system,
    modules,
    isDirty,
}: {
    system: SystemSelection;
    modules: ReturnType<typeof useCampaignModules>;
    isDirty: boolean;
}) {
    const t = useTranslations('rules');

    const [step, setStep] = useState<Step>('modules');

    const { draft, toggles, preview, error, retry, isChanged, set } =
        useModuleDraft(system);

    const isBusy = isDirty || modules.isPending;

    return (
        <div className="mt-4 space-y-3">
            <h3 className="text-sm font-medium">{t('system.modules.title')}</h3>
            <p className="text-xs text-hud-muted">
                {t('system.wizard.step', {
                    current: step === 'modules' ? 1 : 2,
                    total: 2,
                })}{' '}
                {t(`system.wizard.${step}Title`)}
            </p>
            <p className="text-xs text-hud-muted">{t('system.wizard.hint')}</p>
            {isDirty && (
                <p className="text-xs text-hud-muted">
                    {t('system.modules.dirtyHint')}
                </p>
            )}
            {step === 'modules' ? (
                <ModuleStep toggles={toggles} set={set} isDisabled={isBusy} />
            ) : preview ? (
                <SummaryStep preview={preview} />
            ) : error ? (
                <ErrorState
                    error={new Error(t('system.wizard.loadFailed'))}
                    onRetry={retry}
                />
            ) : (
                <LoadingState />
            )}
            <div className="flex flex-wrap gap-2">
                {step === 'modules' ? (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!isChanged || isBusy}
                        onClick={() => setStep('summary')}
                    >
                        {t('system.wizard.next')}
                    </Button>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => setStep('modules')}
                        >
                            {t('system.wizard.back')}
                        </Button>
                        <Button
                            type="button"
                            disabled={isBusy || !preview}
                            onClick={() => void modules.apply(draft)}
                        >
                            {t('system.wizard.apply')}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
