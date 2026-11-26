'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { RulesPatchOffer } from '../shared/RulesPatchOffer';
import { CompendiumStepRail } from './layout/CompendiumStepRail';
import { CompendiumSummary } from './layout/CompendiumSummary';
import { CompendiumWizardLayout } from './layout/CompendiumWizardLayout';
import { CompendiumHistory } from './report/CompendiumHistory';
import { CompendiumMediaReport } from './report/CompendiumMediaReport';
import {
    CompendiumReport,
    DEPENDENCIES_ANCHOR,
} from './report/CompendiumReport';
import { CategoriesStep } from './steps/CategoriesStep';
import { FileStep } from './steps/FileStep';
import { CompendiumDependencies } from './CompendiumDependencies';
import { CompendiumProgress } from './CompendiumProgress';

import { FormAlert } from '@/components/common/states';
import { HudPage, HudPageHeader, HudPanel } from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
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
    const t = useTranslations('compendium.import');

    const wizard = useCompendiumImport(campaignId, initialFile);

    const view = useCompendiumWizardView(wizard.state);

    const expiry = usePreviewExpiry(wizard.state.preview);

    const {
        preview,
        input,
        result,
        rights,
        busy,
        options,
        phase,
        media,
        mediaPaused,
        error,
    } = wizard.state;

    const {
        setRights,
        close,
        applyOptions,
        media: mediaActions,
    } = wizard.actions;

    return (
        <HudPage>
            <HudPageHeader
                title={t('title')}
                subtitle={t('subtitle')}
                actions={
                    <>
                        <Button
                            variant="outline"
                            disabled={busy && !!input}
                            onClick={close}
                        >
                            {t('close')}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={`/campaigns/${campaignId}`}>
                                {t('back')}
                            </Link>
                        </Button>
                    </>
                }
            />
            {!initialFile && <OnboardingHint id="dm.compendium-import" />}
            <CompendiumWizardLayout
                embedded={!!initialFile}
                rail={<CompendiumStepRail wizard={wizard} view={view} />}
                summary={
                    <CompendiumSummary
                        wizard={wizard}
                        view={view}
                        expiry={expiry}
                    />
                }
                step={
                    <div
                        key={view.step}
                        className="motion-rise space-y-4"
                    >
                        <CompendiumProgress phase={phase} media={media} />
                        {error && <FormAlert>{error}</FormAlert>}
                        {view.step === 0 && (
                            <>
                                <FileStep wizard={wizard} />
                                {!initialFile && (
                                    <CompendiumHistory
                                        campaignId={campaignId}
                                        wizard={wizard}
                                    />
                                )}
                            </>
                        )}
                        {view.step === 1 && <CategoriesStep wizard={wizard} />}
                        {view.step === 2 && preview && (
                            <>
                                <HudPanel className="space-y-3">
                                    <RulesPatchOffer wizard={wizard} />
                                    <CompendiumReport
                                        campaignId={campaignId}
                                        report={preview.report}
                                        blockerActions={{
                                            busy,
                                            allowMixedEdition:
                                                options.allowMixedEdition
                                                    ? undefined
                                                    : () =>
                                                          applyOptions({
                                                              ...options,
                                                              allowMixedEdition: true,
                                                          }),
                                        }}
                                    />
                                </HudPanel>
                                <HudPanel className="space-y-3">
                                    <span id={DEPENDENCIES_ANCHOR} />
                                    <CompendiumDependencies
                                        key={preview.token}
                                        wizard={wizard}
                                    />
                                </HudPanel>
                            </>
                        )}
                        {view.step === 3 && preview && (
                            <HudPanel>
                                <label className="flex min-w-0 items-start gap-2 text-sm">
                                    <Checkbox
                                        className="mt-0.5 h-4 w-4 shrink-0 accent-hud-accent"
                                        checked={rights}
                                        disabled={busy}
                                        onCheckedChange={(v) =>
                                            setRights(v === true)
                                        }
                                    />{' '}
                                    {t('rights')}
                                </label>
                            </HudPanel>
                        )}
                        {view.step === 4 && result && (
                            <HudPanel className="space-y-3">
                                <p className="text-hud-good">
                                    {t('saved', { runId: result.runId ?? '' })}
                                </p>
                                {media && (
                                    <CompendiumMediaReport
                                        media={media}
                                        running={phase === 'media'}
                                        paused={mediaPaused}
                                        actions={mediaActions}
                                    />
                                )}
                                <CompendiumReport
                                    key={result.runId}
                                    campaignId={campaignId}
                                    report={result}
                                    committed
                                />
                            </HudPanel>
                        )}
                    </div>
                }
            />
        </HudPage>
    );
}
