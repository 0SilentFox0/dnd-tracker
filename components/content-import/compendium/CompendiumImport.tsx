'use client';
import { type ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { CompendiumStepRail } from './layout/CompendiumStepRail';
import { CompendiumSummary } from './layout/CompendiumSummary';
import { CompendiumWizardLayout } from './layout/CompendiumWizardLayout';
import { CategoriesStep } from './steps/CategoriesStep';
import { CheckStep } from './steps/CheckStep';
import { ConfirmStep } from './steps/ConfirmStep';
import { FileStep } from './steps/FileStep';
import { ResultStep } from './steps/ResultStep';
import { CompendiumProgress } from './CompendiumProgress';
import { compendiumStep, compendiumUnlocked } from './CompendiumSteps';

import { FormAlert } from '@/components/common/states';
import { HudFormMenu } from '@/components/hud/form/HudFormMenu';
import { HudPage, HudPageHeader } from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Button } from '@/components/ui/button';
import { useExpiry } from '@/lib/hooks/common';
import {
    type CompendiumStepId,
    useCompendiumImport,
    useCompendiumWizardView,
    usePreviewDeadline,
} from '@/lib/hooks/compendium-import';

export function CompendiumImport({
    campaignId,
    initialFile,
    footerSlot,
}: {
    campaignId: string;
    initialFile?: File;
    footerSlot?: HTMLElement | null;
}) {
    const t = useTranslations('compendium');

    const tc = useTranslations('common.form');

    const wizard = useCompendiumImport(campaignId, initialFile);

    const [file, setFile] = useState<File | null>(initialFile ?? null);

    const { preview, result, error, phase, media } = wizard.state;

    const view = useCompendiumWizardView(
        (compendiumStep(wizard.state) + 1) as CompendiumStepId,
        compendiumUnlocked(wizard.state)
    );

    const deadline = usePreviewDeadline(preview?.token);

    const expired = useExpiry(deadline);

    const embedded = !!initialFile;

    const summary = (
        <CompendiumSummary wizard={wizard} view={view} expired={expired} />
    );

    const steps: Record<CompendiumStepId, ReactNode> = {
        1: (
            <FileStep
                wizard={wizard}
                file={file}
                onFile={setFile}
                campaignId={embedded ? undefined : campaignId}
            />
        ),
        2: <CategoriesStep wizard={wizard} />,
        3: <CheckStep wizard={wizard} campaignId={campaignId} />,
        4: (
            <ConfirmStep
                wizard={wizard}
                deadline={deadline}
                expired={expired}
            />
        ),
        5: <ResultStep wizard={wizard} campaignId={campaignId} />,
    };

    const restart = {
        label: t('wizard.restart'),
        onSelect: () => {
            setFile(null);
            wizard.actions.close();
        },
        confirm: preview || result ? t('wizard.restartConfirm') : undefined,
    };

    const body = (
        <CompendiumWizardLayout
            rail={
                <CompendiumStepRail
                    wizard={wizard}
                    view={view}
                    details={{ 1: file?.name }}
                />
            }
            step={
                <>
                    <CompendiumProgress phase={phase} media={media} />
                    {view.step !== 1 && error && <FormAlert>{error}</FormAlert>}
                    <div key={view.step} className="motion-rise space-y-3">
                        {steps[view.step]}
                    </div>
                </>
            }
            summary={embedded ? undefined : summary}
        />
    );

    if (embedded)
        return (
            <>
                {body}
                {footerSlot && createPortal(summary, footerSlot)}
            </>
        );

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
                        <HudFormMenu items={[restart]} label={tc('more')} />
                    </>
                }
            />
            <OnboardingHint id="dm.compendium-import" />
            {body}
        </HudPage>
    );
}
