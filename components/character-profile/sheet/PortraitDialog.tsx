'use client';

import { useTranslations } from 'next-intl';

import { ImageUpload } from '@/components/common/fields/ImageUpload';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

interface PortraitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: string;
    onChange: (value: string) => void;
    name?: string;
}

export function PortraitDialog({
    open,
    onOpenChange,
    value,
    onChange,
    name,
}: PortraitDialogProps) {
    const t = useTranslations('characterProfile.portrait');

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('change')}
            hud
        >
            <ImageUpload
                value={value}
                onChange={onChange}
                fallbackText={name}
                maxSide={1200}
            />
        </ResponsiveDialog>
    );
}
