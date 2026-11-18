'use client';

import { useTranslations } from 'next-intl';
import { Download, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FileButton } from '@/components/ui/file-button';
import { useSkillTreeTransfer } from '@/systems/skilltrees/hooks';

export function SkillTreeTransferButtons({
    campaignId,
}: {
    campaignId: string;
}) {
    const t = useTranslations('skillTree.transfer');

    const transfer = useSkillTreeTransfer(campaignId);

    return (
        <div className="flex flex-wrap justify-end gap-2">
            <FileButton
                accept=".json"
                inputLabel={t('fileLabel')}
                onFile={(file) => void transfer.actions.importFile(file)}
                variant="outline"
                size="sm"
                disabled={!transfer.ready || transfer.busy}
            >
                <Upload className="h-4 w-4" />
                {t('import')}
            </FileButton>
            <Button
                variant="outline"
                size="sm"
                disabled={!transfer.ready}
                onClick={transfer.actions.exportAll}
            >
                <Download className="h-4 w-4" />
                {t('export')}
            </Button>
        </div>
    );
}
