'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { MAX_SOUND_SECONDS } from '@/lib/constants/soundboard';
import { useImportSoundLink } from '@/lib/hooks/soundboard';
import { translateIssue } from '@/lib/i18n/translate-issue';
import { useTranslator } from '@/lib/i18n/use-translator';

function LinkForm({ onClose }: { onClose: () => void }) {
    const t = useTranslations('soundboard');

    const tr = useTranslator();

    const importLink = useImportSoundLink();

    const [url, setUrl] = useState('');

    const [error, setError] = useState<string | null>(null);

    const busy = importLink.isPending;

    const submit = async () => {
        const sourceUrl = url.trim();

        if (!sourceUrl) return;

        setError(null);

        try {
            const { rejected } = await importLink.mutateAsync(sourceUrl);

            if (rejected) {
                setError(
                    rejected === 'invalid'
                        ? t('link.invalid')
                        : t('link.tooLong', { seconds: MAX_SOUND_SECONDS })
                );

                return;
            }

            onClose();
        } catch (e) {
            setError(
                translateIssue(tr, {
                    message: e instanceof Error ? e.message : 'link.invalid',
                })
            );
        }
    };

    return (
        <ResponsiveDialog
            hud
            open
            onOpenChange={(open) => !open && onClose()}
            title={t('link.title')}
            footer={
                <Button
                    disabled={busy || !url.trim()}
                    onClick={() => void submit()}
                >
                    {t('link.import')}
                </Button>
            }
        >
            <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-xs text-hud-muted">
                    {t('link.url')}
                    <Input
                        type="url"
                        value={url}
                        placeholder="https://"
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </label>
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </ResponsiveDialog>
    );
}

export function LinkDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    return open ? <LinkForm onClose={onClose} /> : null;
}
