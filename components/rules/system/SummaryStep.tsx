import { useTranslator } from '@/lib/i18n/use-translator';
import type { CompositionPreview } from '@/lib/utils/rules/systems/preview';

function Group({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: string[];
    emptyLabel: string;
}) {
    return (
        <div>
            <h4 className="text-xs font-medium text-hud-muted uppercase">
                {title}
            </h4>
            <p className="text-sm">
                {items.length > 0 ? items.join(', ') : emptyLabel}
            </p>
        </div>
    );
}

export function SummaryStep({ preview }: { preview: CompositionPreview }) {
    const t = useTranslator('rules');

    const tTerms = useTranslator('gameTerms');

    const tCommon = useTranslator('common');

    const tBattle = useTranslator('battleCommon');

    const none = t('system.wizard.none');

    const names = (ids: string[]) =>
        ids.map((id) => tTerms(`module.${id}.name`));

    return (
        <div className="space-y-3" data-testid="module-summary">
            <Group
                title={t('system.wizard.added')}
                items={names(preview.added)}
                emptyLabel={none}
            />
            <Group
                title={t('system.wizard.removed')}
                items={names(preview.removed)}
                emptyLabel={none}
            />
            <div>
                <h4 className="text-xs font-medium text-hud-muted uppercase">
                    {t('system.wizard.sheet')}
                </h4>
                <p className="text-sm">
                    {t('system.wizard.sheetBlocks', {
                        count: preview.sheetBlocks,
                    })}
                </p>
            </div>
            <Group
                title={t('system.wizard.rulesSections')}
                items={preview.rulesSections.map((key) =>
                    t(`mechanics.${key}.label`)
                )}
                emptyLabel={none}
            />
            <Group
                title={t('system.wizard.contentKinds')}
                items={preview.contentKinds.map((kind) =>
                    t(`system.wizard.kinds.${kind}`)
                )}
                emptyLabel={none}
            />
            <Group
                title={t('system.wizard.dmSections')}
                items={preview.dmSections.map((id) =>
                    tCommon(`dmSections.${id}`)
                )}
                emptyLabel={none}
            />
            <Group
                title={t('system.wizard.actions')}
                items={preview.actions.map((key) =>
                    tBattle.has(`coreActions.${key}`)
                        ? tBattle(`coreActions.${key}`)
                        : key
                )}
                emptyLabel={none}
            />
            {preview.setup.length > 0 && (
                <p className="text-xs text-hud-muted">
                    {t('system.wizard.setupNotice')}
                </p>
            )}
            <p className="text-xs text-hud-muted">
                {t('system.wizard.keepsData')}
            </p>
        </div>
    );
}
