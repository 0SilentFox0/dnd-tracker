'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload } from 'lucide-react';

import { FileButton } from '@/components/ui/file-button';
import { TRACK_FILE_ACCEPT } from '@/lib/constants/music';
import { useNotify } from '@/lib/hooks/common';
import { useSoundMutations } from '@/lib/hooks/soundboard';
import { translateIssue } from '@/lib/i18n/translate-issue';
import { useTranslator } from '@/lib/i18n/use-translator';
import { readAudioDuration } from '@/lib/utils/audio/read-duration';

export function SoundUploader({ campaignId }: { campaignId: string }) {
    const t = useTranslations('soundboard');

    const tr = useTranslator();

    const notify = useNotify();

    const { upload } = useSoundMutations(campaignId);

    const [busy, setBusy] = useState(false);

    const onFile = async (file: File) => {
        setBusy(true);

        try {
            const seconds = await readAudioDuration(file);

            await upload.mutateAsync({
                file,
                name: file.name.replace(/\.[^.]+$/, ''),
                durationMs: Math.round((seconds ?? 0) * 1000),
            });
        } catch (error) {
            void notify(
                translateIssue(tr, {
                    message:
                        error instanceof Error
                            ? error.message
                            : 'soundboard.uploadFailed',
                })
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <FileButton
            accept={TRACK_FILE_ACCEPT}
            inputLabel={t('upload.fileLabel')}
            onFile={onFile}
            disabled={busy}
            size="sm"
        >
            <Upload />
            {busy ? t('upload.pending') : t('upload.button')}
        </FileButton>
    );
}
