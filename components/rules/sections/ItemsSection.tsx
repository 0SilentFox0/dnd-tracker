import { useTranslations } from 'next-intl';

import { NumberField } from '../NumberField';
import { useHasRule } from '../RulesPaths';
import { RulesSection } from '../RulesSection';

import { SwitchField } from '@/components/ui/switch-field';
import type { RulesFormState } from '@/lib/hooks/campaigns';

export function ItemsSection({ form }: { form: RulesFormState }) {
    const t = useTranslations('rules');

    const has = useHasRule();

    const items = form.data.items;

    return (
        <RulesSection mechanic="items">
            <SwitchField
                id="rules-items-enabled"
                label={t('sections.items.enabled')}
                checked={items.enabled}
                onCheckedChange={(enabled) =>
                    form.set('items', { ...items, enabled })
                }
            />
            {has('items.attunementLimit') && (
                <NumberField
                    label={t('sections.items.attunementLimit')}
                    value={items.attunementLimit}
                    range={[1, 10]}
                    disabled={!items.enabled}
                    onCommit={(attunementLimit) =>
                        form.set('items', { ...items, attunementLimit })
                    }
                />
            )}
        </RulesSection>
    );
}
