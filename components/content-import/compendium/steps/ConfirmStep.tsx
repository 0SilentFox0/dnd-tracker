'use client';
import { useTranslations } from 'next-intl';

import { Counts } from '../report/CompendiumReportCards';

import { HudPanel } from '@/components/hud/page';
import { Checkbox } from '@/components/ui/checkbox';
import type {
    CompendiumImportController,
    PreviewExpiry,
} from '@/lib/hooks/compendium-import';
import { useTranslator } from '@/lib/i18n/use-translator';
import { changesByKind } from '@/lib/utils/compendium-import/changes';
import { kindLabel } from '@/lib/utils/compendium-import/labels';

export function ConfirmStep({
    wizard,
    expiry,
}: {
    wizard: CompendiumImportController;
    expiry: PreviewExpiry;
}) {
    const t = useTranslations('compendium');

    const tr = useTranslator('compendium');

    const { preview, rights, busy } = wizard.state;

    if (!preview) return null;

    return (
        <div className="space-y-4">
            {expiry.expired && (
                <p
                    role="alert"
                    className="rounded-xl border border-hud-bad p-3 text-sm text-hud-bad"
                >
                    {t('confirm.expired')}
                </p>
            )}
            <HudPanel className="space-y-3">
                <h3 className="hud-sc text-base text-hud-ink">
                    {t('confirm.changes')}
                </h3>
                <Counts counts={preview.report.counts} />
                <ul className="space-y-1 text-sm text-hud-muted">
                    {changesByKind(preview.report.rows).map((entry) => (
                        <li key={entry.kind}>
                            <strong className="text-hud-ink">
                                {kindLabel(tr, entry.kind)}
                            </strong>
                            {': '}
                            {t('report.counts', { ...entry, errors: 0 })}
                        </li>
                    ))}
                </ul>
            </HudPanel>
            <HudPanel>
                <label className="flex min-w-0 items-start gap-2 text-sm">
                    <Checkbox
                        className="mt-0.5 h-4 w-4 shrink-0 accent-hud-accent"
                        checked={rights}
                        disabled={busy}
                        onCheckedChange={(v) =>
                            wizard.actions.setRights(v === true)
                        }
                    />{' '}
                    {t('import.rights')}
                </label>
            </HudPanel>
        </div>
    );
}
