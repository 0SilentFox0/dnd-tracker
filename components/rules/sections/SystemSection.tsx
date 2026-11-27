import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';

import { ModuleWizard } from '../system/ModuleWizard';

import { HudSection } from '@/components/hud/form';
import { SelectField } from '@/components/ui/select-field';
import type { RulesFormState, useCampaignModules } from '@/lib/hooks/campaigns';
import { ruleSystemLabelKey } from '@/lib/i18n/system-scope';
import { useTranslator } from '@/lib/i18n/use-translator';
import { selectableKeysOf } from '@/lib/utils/rules/systems/catalog';
import { RULE_SYSTEM_KEYS } from '@/lib/utils/rules/systems/meta';

const SELECTABLE_KEYS = selectableKeysOf(RULE_SYSTEM_KEYS);

export function SystemSection({
    form,
    locked,
    modules,
    dirty,
}: {
    form: RulesFormState;
    locked: boolean;
    modules: ReturnType<typeof useCampaignModules>;
    dirty: boolean;
}) {
    const t = useTranslations('rules');

    const tTerms = useTranslator('gameTerms');

    const { system } = form.data;

    return (
        <HudSection title={t('system.label')} className="px-4 py-3">
            <p className="mb-3 text-sm text-hud-muted">
                {t('system.description')}
            </p>
            <div className="relative">
                <SelectField
                    id="rules-system-key"
                    aria-label={t('system.label')}
                    value={form.data.system.key}
                    onValueChange={(key) => form.set('system', { key })}
                    options={RULE_SYSTEM_KEYS.filter(
                        (key) =>
                            key === system.key || SELECTABLE_KEYS.includes(key)
                    ).map((key) => ({
                        value: key,
                        label: tTerms(ruleSystemLabelKey(key)),
                    }))}
                    disabled={locked}
                />
                {locked && (
                    <Lock
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 right-9 size-4 -translate-y-1/2 text-hud-muted"
                    />
                )}
            </div>
            {locked && (
                <p className="mt-2 text-xs text-hud-muted">
                    {t('system.lockedHint')}
                </p>
            )}
            {modules.toggles.length > 0 && (
                <ModuleWizard
                    key={`${system.key}:${(system.modules ?? []).join(',')}`}
                    system={system}
                    modules={modules}
                    isDirty={dirty}
                />
            )}
        </HudSection>
    );
}
