'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { MAX_SOUND_SECONDS } from '@/lib/constants/soundboard';
import { useLibraryMutations } from '@/lib/hooks/soundboard';
import { translateIssue } from '@/lib/i18n/translate-issue';
import { useTranslator } from '@/lib/i18n/use-translator';
import { decodeDurationMs } from '@/lib/utils/soundboard/decode-duration';

function LinkForm({ onClose }: { onClose: () => void }) {
    const t = useTranslations('soundboard');

    const tr = useTranslator();

    const { importLink, create, discard } = useLibraryMutations();

    const [url, setUrl] = useState('');

    const [error, setError] = useState<string | null>(null);

    const [busy, setBusy] = useState(false);

    const submit = async () => {
        const sourceUrl = url.trim();

        if (!sourceUrl) return;

        setBusy(true);
        setError(null);

        try {
            const imported = await importLink.mutateAsync(sourceUrl);

            let durationMs: number | null = null;

            try {
                durationMs = await decodeDurationMs(imported.url);
            } catch {
                durationMs = null;
            }

            if (durationMs === null || durationMs > MAX_SOUND_SECONDS * 1000) {
                await discard.mutateAsync(imported.path).catch(() => {});
                setError(
                    durationMs === null
                        ? t('link.invalid')
                        : t('link.tooLong', { seconds: MAX_SOUND_SECONDS })
                );

                return;
            }

            await create.mutateAsync({
                path: imported.path,
                durationMs,
                source: 'link',
                sourceUrl,
            });

            onClose();
        } catch (e) {
            setError(
                translateIssue(tr, {
                    message: e instanceof Error ? e.message : 'link.invalid',
                })
            );
        } finally {
            setBusy(false);
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
