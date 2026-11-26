'use client';
import { useTranslations } from 'next-intl';

import { CompendiumHistory } from '../history/CompendiumHistory';

import { FileDropZone } from '@/components/common/fields/FileDropZone';
import { FormAlert } from '@/components/common/states';
import { HudPanel } from '@/components/hud/page';
import type { CompendiumImportController } from '@/lib/hooks/compendium-import';

export function FileStep({
    wizard,
    file,
    onFile,
    campaignId,
}: {
    wizard: CompendiumImportController;
    file: File | null;
    onFile: (file: File | null) => void;
    campaignId?: string;
}) {
    const t = useTranslations('compendium.file');

    const { busy, error } = wizard.state;

    return (
        <>
            <HudPanel className="space-y-3">
                <p className="text-sm">{t('intro')}</p>
                <p className="text-sm text-hud-muted">{t('csvHint')}</p>
                <FileDropZone
                    accept=".json,application/json"
                    label={t('drop')}
                    disabled={busy}
                    file={
                        file && {
                            name: file.name,
                            size: file.size,
                            replaceLabel: t('replace'),
                            onReplace: () => onFile(null),
                        }
                    }
                    onFiles={([picked]) => {
                        onFile(picked);
                        void wizard.actions.selectFile(picked);
                    }}
                />
                {error && <FormAlert>{error}</FormAlert>}
            </HudPanel>
            {campaignId && (
                <CompendiumHistory campaignId={campaignId} wizard={wizard} />
            )}
        </>
    );
}
