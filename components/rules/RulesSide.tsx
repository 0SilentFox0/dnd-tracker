'use client';

import { useTranslations } from 'next-intl';

import { useMechanicText } from './mechanic-text';
import { ChangedChip, ChipRow } from './RulesChips';

import { HudSectionTitle } from '@/components/hud/page';
import { Button } from '@/components/ui/button';

const CHANGED_LIMIT = 6;

export function RulesSide({
    changed,
    reset,
    actions,
}: {
    changed: readonly string[];
    reset: (key: string) => void;
    actions?: {
        formId: string;
        canSave: boolean;
        isSaving: boolean;
        onCancel: () => void;
    };
}) {
    const t = useTranslations('rules');

    const tc = useTranslations('common');

    const text = useMechanicText();

    const labelOf = (key: string) =>
        key === 'system' ? t('system.label') : text(key, 'label');

    return (
        <div className="space-y-4">
            <section className="space-y-2">
                <HudSectionTitle>{t('page.changes')}</HudSectionTitle>
                {changed.length > 0 ? (
                    <ChipRow
                        items={changed}
                        limit={CHANGED_LIMIT}
                        keyOf={(key) => key}
                        render={(key) => (
                            <ChangedChip
                                label={labelOf(key)}
                                resetLabel={t('page.resetSection')}
                                onReset={() => reset(key)}
                            />
                        )}
                    />
                ) : (
                    <p className="text-sm text-hud-muted">
                        {t('page.noChanges')}
                    </p>
                )}
            </section>
            {actions && (
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!actions.canSave || actions.isSaving}
                        onClick={actions.onCancel}
                    >
                        {tc('actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form={actions.formId}
                        disabled={!actions.canSave || actions.isSaving}
                    >
                        {tc('actions.save')}
                    </Button>
                </div>
            )}
            <p className="text-xs text-hud-muted">{t('form.hint')}</p>
        </div>
    );
}
