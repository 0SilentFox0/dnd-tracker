'use client';
import { useTranslations } from 'next-intl';

import { StepIndicator } from '@/components/common/shell/StepIndicator';
import {
    compendiumFacts,
    type CompendiumImportController,
    type WizardView,
} from '@/lib/hooks/compendium-import';
import { formatBytes } from '@/lib/utils/common/format';

const RAIL_KEYS = ['file', 'categories', 'check', 'confirm'] as const;

export function CompendiumStepRail({
    wizard,
    view,
}: {
    wizard: CompendiumImportController;
    view: WizardView;
}) {
    const t = useTranslations('compendium');

    const { file, root } = wizard.state;

    const facts = compendiumFacts(wizard.state);

    return (
        <div className="ds-panel p-3 @6xl:[&_[data-slot=step-detail]]:block @6xl:[&_ol]:flex-col @6xl:[&_ol]:items-stretch [&_[data-slot=step-detail]]:hidden">
            <StepIndicator
                label={t('import.steps.label')}
                steps={RAIL_KEYS.map((key) => t(`import.steps.${key}`))}
                current={view.step}
                max={view.maxStep}
                onSelect={view.setStep}
                details={[
                    file ? `${file.name} · ${formatBytes(file.size)}` : undefined,
                    root
                        ? t('categoriesStep.summary', {
                              categories: facts.categories,
                              records: facts.records,
                          })
                        : undefined,
                ]}
            />
        </div>
    );
}
