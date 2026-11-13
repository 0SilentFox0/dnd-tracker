import { useTranslations } from 'next-intl';

import { HudSection } from '@/components/hud/form';
import { SelectField } from '@/components/ui/select-field';
import { SwitchField } from '@/components/ui/switch-field';
import type { RulesFormState, useCampaignModules } from '@/lib/hooks/campaigns';
import { ruleSystemLabelKey } from '@/lib/i18n/system-scope';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { ModuleToggle } from '@/lib/utils/rules/systems/catalog';
import { RULE_SYSTEM_KEYS } from '@/lib/utils/rules/systems/meta';

const REASON_KEYS = {
    missingRequires: 'requires',
    conflict: 'conflicts',
    requiredBy: 'requiredBy',
} as const;

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

    const hint = (toggle: ModuleToggle) =>
        toggle.reason
            ? t(`system.modules.${REASON_KEYS[toggle.reason.code]}`, {
                  module: tTerms(`module.${toggle.reason.module}.name`),
              })
            : undefined;

    return (
        <HudSection title={t('system.label')} className="px-4 py-3">
            <p className="mb-3 text-sm text-hud-muted">
                {t('system.description')}
            </p>
            <SelectField
                id="rules-system-key"
                aria-label={t('system.label')}
                value={form.data.system.key}
                onValueChange={(key) => form.set('system', { key })}
                options={RULE_SYSTEM_KEYS.map((key) => ({
                    value: key,
                    label: tTerms(ruleSystemLabelKey(key)),
                }))}
                disabled={locked}
            />
            {locked && (
                <p className="mt-2 text-xs text-hud-muted">
                    {t('system.lockedHint')}
                </p>
            )}
            {modules.toggles.length > 0 && (
                <div className="mt-4 space-y-3">
                    <h3 className="text-sm font-medium">
                        {t('system.modules.title')}
                    </h3>
                    <p className="text-xs text-hud-muted">
                        {t('system.modules.hint')}
                    </p>
                    {dirty && (
                        <p className="text-xs text-hud-muted">
                            {t('system.modules.dirtyHint')}
                        </p>
                    )}
                    {modules.toggles.map((toggle) => {
                        const reason = hint(toggle);

                        const summary = tTerms(`module.${toggle.id}.summary`);

                        const name = tTerms(`module.${toggle.id}.name`);

                        return (
                            <SwitchField
                                key={toggle.id}
                                id={`rules-module-${toggle.id}`}
                                ariaLabel={name}
                                label={
                                    <>
                                        {name}
                                        {toggle.toggle === 'setup' && (
                                            <span className="ml-2 text-xs text-hud-muted">
                                                {t('system.modules.setupBadge')}
                                            </span>
                                        )}
                                    </>
                                }
                                description={
                                    reason ? `${summary} ${reason}` : summary
                                }
                                checked={toggle.active}
                                disabled={
                                    !toggle.available ||
                                    dirty ||
                                    modules.isPending
                                }
                                onCheckedChange={(on) =>
                                    void modules.toggle(toggle.id, on)
                                }
                            />
                        );
                    })}
                </div>
            )}
        </HudSection>
    );
}
