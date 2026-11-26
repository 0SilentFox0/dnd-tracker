'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

export function HudFormSide({ children }: { children: ReactNode }) {
    const t = useTranslations('common');

    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setOpen(true)}
            >
                <Eye aria-hidden />
                {t('ui.preview')}
            </Button>
            <ResponsiveDialog
                hud
                open={open}
                onOpenChange={setOpen}
                title={t('ui.previewTitle')}
            >
                {children}
            </ResponsiveDialog>
        </>
    );
}

export function HudFormAside({ children }: { children: ReactNode }) {
    const t = useTranslations('common');

    return (
        <aside aria-label={t('ui.preview')} className="hud-form-side">
            {children}
        </aside>
    );
}
