'use client';

import { useTranslations } from 'next-intl';

import { ImageUpload } from '@/components/common/fields/ImageUpload';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

interface PortraitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: string | null;
    onChange: (url: string | null) => void;
}

export function PortraitDialog({
    open,
    onOpenChange,
    value,
    onChange,
}: PortraitDialogProps) {
    const t = useTranslations('characterProfile.portrait');

    return (
        <ResponsiveDialog
            hud
            open={open}
            onOpenChange={onOpenChange}
            title={t('change')}
        >
            <ImageUpload
                value={value ?? ''}
                onChange={(url) => onChange(url || null)}
                maxSide={1200}
            />
        </ResponsiveDialog>
    );
}
