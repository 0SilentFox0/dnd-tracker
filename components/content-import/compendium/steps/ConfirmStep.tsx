'use client';
import { useLocale, useTranslations } from 'next-intl';

import { Counts } from '../report/CompendiumReportCards';

import { HudPanel } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { CompendiumImportController } from '@/lib/hooks/compendium-import';

export function ConfirmStep({
    wizard,
    deadline,
    expired,
}: {
    wizard: CompendiumImportController;
    deadline: string | null;
    expired: boolean;
}) {
    const t = useTranslations('compendium');

    const locale = useLocale();

    const { preview, rights, busy } = wizard.state;

    const { setRights, runPreview } = wizard.actions;

    if (!preview) return null;

    return (
        <HudPanel className="space-y-3">
            <Counts counts={preview.report.counts} />
            <label className="flex min-w-0 items-start gap-2 text-sm">
                <Checkbox
                    className="mt-0.5 h-4 w-4 shrink-0 accent-hud-accent"
                    checked={rights}
                    disabled={busy}
                    onCheckedChange={(v) => setRights(v === true)}
                />{' '}
                {t('import.rights')}
            </label>
            {expired ? (
                <div
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hud-bad p-3 text-sm"
                >
                    <span>{t('confirm.expired')}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void runPreview()}
                    >
                        {t('confirm.recheck')}
                    </Button>
                </div>
            ) : (
                deadline && (
                    <p className="text-xs text-hud-muted">
                        {t('confirm.expiresIn', {
                            time: new Date(deadline).toLocaleTimeString(
                                locale,
                                { hour: '2-digit', minute: '2-digit' }
                            ),
                        })}
                    </p>
                )
            )}
        </HudPanel>
    );
}
