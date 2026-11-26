'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { CompendiumStepRail } from './layout/CompendiumStepRail';
import { CompendiumSummary } from './layout/CompendiumSummary';
import { CompendiumWizardLayout } from './layout/CompendiumWizardLayout';
import { CompendiumHistory } from './report/CompendiumHistory';
import { CategoriesStep } from './steps/CategoriesStep';
import { CheckStep } from './steps/CheckStep';
import { ConfirmStep } from './steps/ConfirmStep';
import { FileStep } from './steps/FileStep';
import { ResultStep } from './steps/ResultStep';
import { StepHeading } from './steps/StepHeading';

import { FormAlert } from '@/components/common/states';
import { HudFormMenu } from '@/components/hud';
import { HudPage, HudPageHeader } from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Button } from '@/components/ui/button';
import {
    COMPENDIUM_STEP_KEYS,
    useCompendiumImport,
    useCompendiumWizardView,
    usePreviewExpiry,
} from '@/lib/hooks/compendium-import';

export function CompendiumImport({
    campaignId,
    initialFile,
}: {
    campaignId: string;
    initialFile?: File;
}) {
    const t = useTranslations('compendium');

    const wizard = useCompendiumImport(campaignId, initialFile);

    const view = useCompendiumWizardView(wizard.state);

    const expiry = usePreviewExpiry(wizard.state.preview);

    const { preview, input, result, busy, phase, media, error } = wizard.state;

    const embedded = !!initialFile;

    const title =
        view.step === 4
            ? t('result.title')
            : t(`import.steps.${COMPENDIUM_STEP_KEYS[view.step]}`);

    const body = (
        <CompendiumWizardLayout
            embedded={embedded}
            rail={<CompendiumStepRail wizard={wizard} view={view} />}
            summary={
                <CompendiumSummary wizard={wizard} view={view} expiry={expiry} />
            }
            step={
                <div key={view.step} className="motion-rise space-y-4">
                    <StepHeading title={title} phase={phase} media={media} />
                    {error && <FormAlert>{error}</FormAlert>}
                    {view.step === 0 && (
                        <>
                            <FileStep wizard={wizard} />
                            {!embedded && (
                                <CompendiumHistory
                                    campaignId={campaignId}
                                    wizard={wizard}
                                />
                            )}
                        </>
                    )}
                    {view.step === 1 && <CategoriesStep wizard={wizard} />}
                    {view.step === 2 && (
                        <CheckStep campaignId={campaignId} wizard={wizard} />
                    )}
                    {view.step === 3 && (
                        <ConfirmStep wizard={wizard} expiry={expiry} />
                    )}
                    {view.step === 4 && (
                        <ResultStep campaignId={campaignId} wizard={wizard} />
                    )}
                </div>
            }
        />
    );

    if (embedded) return body;

    return (
        <HudPage>
            <HudPageHeader
                title={t('import.title')}
                subtitle={t('import.subtitle')}
                actions={
                    <>
                        <Button variant="outline" asChild>
                            <Link href={`/campaigns/${campaignId}`}>
                                {t('import.back')}
                            </Link>
                        </Button>
                        <HudFormMenu
                            items={[
                                {
                                    label: t('wizard.restart'),
                                    onSelect: wizard.actions.close,
                                    disabled: busy && !!input,
                                    confirm:
                                        preview || result
                                            ? {
                                                  title: t('wizard.restart'),
                                                  description: t(
                                                      'wizard.restartText'
                                                  ),
                                                  confirmLabel:
                                                      t('wizard.restart'),
                                                  destructive: true,
                                              }
                                            : undefined,
                                },
                            ]}
                        />
                    </>
                }
            />
            <OnboardingHint id="dm.compendium-import" />
            {body}
        </HudPage>
    );
}
