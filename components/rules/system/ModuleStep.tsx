import { useTranslations } from 'next-intl';

import { SwitchField } from '@/components/ui/switch-field';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { ModuleToggle } from '@/lib/utils/rules/systems/catalog';

const REASON_KEYS = {
    missingRequires: 'requires',
    conflict: 'conflicts',
    requiredBy: 'requiredBy',
} as const;

export function ModuleStep({
    toggles,
    set,
    isDisabled,
}: {
    toggles: ModuleToggle[];
    set: (id: string, on: boolean) => void;
    isDisabled: boolean;
}) {
    const t = useTranslations('rules');

    const tTerms = useTranslator('gameTerms');

    return (
        <ul className="space-y-3">
            {toggles.map((toggle) => {
                const name = tTerms(`module.${toggle.id}.name`);

                const summary = tTerms(`module.${toggle.id}.summary`);

                const reason = toggle.reason
                    ? t(`system.modules.${REASON_KEYS[toggle.reason.code]}`, {
                          module: tTerms(`module.${toggle.reason.module}.name`),
                      })
                    : undefined;

                return (
                    <li
                        key={toggle.id}
                        className="border-hud-border rounded-md border px-3 py-2"
                    >
                        <SwitchField
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
                            disabled={!toggle.available || isDisabled}
                            onCheckedChange={(on) => set(toggle.id, on)}
                        />
                    </li>
                );
            })}
        </ul>
    );
}
