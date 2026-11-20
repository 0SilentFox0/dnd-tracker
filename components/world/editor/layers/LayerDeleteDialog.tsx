'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import type { DeleteWorldLayerMode } from '@/types/world';

interface LayerDeleteDialogProps {
    open: boolean;
    name: string;
    markerCount: number;
    onChoose(mode: DeleteWorldLayerMode | null): void;
}

export function LayerDeleteDialog({
    open,
    name,
    markerCount,
    onChoose,
}: LayerDeleteDialogProps) {
    const t = useTranslations('world.layers');

    const tc = useTranslations('common.actions');

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={(next) => !next && onChoose(null)}
            title={t('deleteTitle', { name })}
            description={t('deleteDescription', { count: markerCount })}
            footer={
                <>
                    <Button variant="outline" onClick={() => onChoose(null)}>
                        {tc('cancel')}
                    </Button>
                    <Button variant="outline" onClick={() => onChoose('ungroup')}>
                        {t('deleteUngroup')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => onChoose('delete')}
                    >
                        {t('deleteWithMarkers')}
                    </Button>
                </>
            }
        >
            <p className="text-sm text-hud-muted">{t('deleteUngroupWarning')}</p>
        </ResponsiveDialog>
    );
}
