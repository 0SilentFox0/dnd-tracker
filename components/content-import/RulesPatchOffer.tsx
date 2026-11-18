'use client';
import { Checkbox } from '@/components/ui/checkbox';
import type { CompendiumImportController } from '@/lib/hooks/compendium-import';
import { useTranslator } from '@/lib/i18n/use-translator';
import { describeRulesPatch } from '@/lib/utils/compendium-import/labels';

export function RulesPatchOffer({
    wizard,
}: {
    wizard: CompendiumImportController;
}) {
    const t = useTranslator('compendium');

    const { preview, options, busy } = wizard.state;

    const patch = preview?.report.recommendedRulesPatch;

    if (!patch) return null;

    return (
        <div className="space-y-1 rounded-lg border border-hud-gold p-3 text-sm">
            {'classes' in patch && <p>{t('rulesOffer.text')}</p>}
            {'conditions' in patch && <p>{t('rulesOffer.conditions')}</p>}
            <label className="flex items-start gap-2">
                <Checkbox
                    className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold"
                    checked={!!options.rulesPatch}
                    disabled={busy}
                    onCheckedChange={(v) =>
                        wizard.actions.applyOptions({
                            ...options,
                            rulesPatch: v === true ? patch : undefined,
                        })
                    }
                />{' '}
                {t('rulesOffer.apply', {
                    summary: describeRulesPatch(t, patch),
                })}
            </label>
        </div>
    );
}
