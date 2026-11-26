'use client';

import { type ReactNode, useState } from 'react';

import { HudButton } from '@/components/hud/HudButton';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

export function HudFormPreviewButton({
    label,
    title,
    children,
}: {
    label: string;
    title: string;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <HudButton
                onClick={() => setOpen(true)}
                className="rounded-lg border border-hud-rule px-3 py-1.5 text-sm text-hud-soft hover:bg-hud-raised lg:hidden"
            >
                {label}
            </HudButton>
            {open && (
                <ResponsiveDialog hud open title={title} onOpenChange={setOpen}>
                    {children}
                </ResponsiveDialog>
            )}
        </>
    );
}
