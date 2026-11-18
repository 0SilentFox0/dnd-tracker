import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';
import type { IngredientLine } from '@/lib/hooks/battle';

export function IngredientsLine({
    line,
    onUse,
}: {
    line: IngredientLine | null;
    onUse?: (value: boolean) => void;
}) {
    const t = useTranslations('battleWizards.spell.ingredients');

    if (!line) return null;

    const shown = !line.optional || line.use;

    return (
        <div className="mt-2 text-sm" data-testid="ingredients-line">
            <p>{t('need', { list: line.need })}</p>
            {line.optional && (
                <label className="mt-1 flex items-center gap-2">
                    <Checkbox
                        checked={line.use}
                        onCheckedChange={(v) => onUse?.(v === true)}
                    />
                    {t('use')}
                </label>
            )}
            {line.blocked && (
                <p className="text-destructive">
                    {t('missing', { list: line.missing })}
                </p>
            )}
            {shown && !line.blocked && line.payGp > 0 && (
                <p className="text-xs text-[var(--hud-muted)] italic">
                    {t('autoPay', { gp: line.payGp })}
                </p>
            )}
        </div>
    );
}
