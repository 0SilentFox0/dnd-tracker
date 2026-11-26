'use client';
import { useTranslations } from 'next-intl';

import { FileDropZone } from '@/components/common/fields/FileDropZone';
import type { CompendiumImportController } from '@/lib/hooks/compendium-import';
import { useTranslator } from '@/lib/i18n/use-translator';
import { metaSummary } from '@/lib/utils/compendium-import/labels';

export function FileStep({ wizard }: { wizard: CompendiumImportController }) {
    const t = useTranslations('compendium.file');

    const tc = useTranslator('compendium');

    const { root, file, busy } = wizard.state;

    const edition = root ? metaSummary(tc, root._meta).edition : undefined;

    return (
        <div className="space-y-3">
            <p className="text-sm">{t('intro')}</p>
            <FileDropZone
                accept=".json,application/json"
                label={t('drop')}
                hint={t('csvHint')}
                busy={busy}
                file={
                    file
                        ? {
                              ...file,
                              meta: edition,
                              replaceLabel: t('replace'),
                          }
                        : null
                }
                onFile={(picked) => void wizard.actions.selectFile(picked)}
            />
                </div>
    );
}
