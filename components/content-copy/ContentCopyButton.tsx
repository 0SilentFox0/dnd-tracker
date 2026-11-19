'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ContentKind } from '@/lib/constants/content-kinds';
import { useContentCopyOptions } from '@/lib/hooks/content-copy';

const ContentCopyDialog = dynamic(
    () => import('./ContentCopyDialog').then((m) => m.ContentCopyDialog),
    { ssr: false }
);

export function ContentCopyButton({
    campaignId,
    kind,
}: {
    campaignId: string;
    kind: ContentKind;
}) {
    const t = useTranslations('contentCopy');

    const [open, setOpen] = useState(false);

    const options = useContentCopyOptions(campaignId, kind, true);

    if (!options.data || options.data.campaigns.length === 0) return null;

    return (
        <>
            <Button
                variant="outline"
                className="text-xs whitespace-nowrap sm:text-sm"
                onClick={() => setOpen(true)}
            >
                <Copy className="h-4 w-4" />
                {t('button')}
            </Button>
            {open && (
                <ContentCopyDialog
                    campaignId={campaignId}
                    kind={kind}
                    open={open}
                    onOpenChange={setOpen}
                />
            )}
        </>
    );
}
