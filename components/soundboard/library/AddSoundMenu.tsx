'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileAudio, Link2, Mic, Plus } from 'lucide-react';

import { LinkDialog } from './LinkDialog';
import { RecordDialog } from './RecordDialog';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HiddenFileInput } from '@/components/ui/file-button';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { TRACK_FILE_ACCEPT } from '@/lib/constants/music';
import { MAX_SOUND_SECONDS, SOUND_NAME_MAX } from '@/lib/constants/soundboard';
import { useNotify } from '@/lib/hooks/common';
import {
    isRecorderSupported,
    useLibraryMutations,
} from '@/lib/hooks/soundboard';
import { translateIssue } from '@/lib/i18n/translate-issue';
import { useTranslator } from '@/lib/i18n/use-translator';
import { readAudioDuration } from '@/lib/utils/audio/read-duration';

type Dialog = 'record' | 'link' | null;

export function AddSoundMenu() {
    const t = useTranslations('soundboard');

    const tr = useTranslator();

    const notify = useNotify();

    const { upload } = useLibraryMutations();

    const input = useRef<HTMLInputElement>(null);

    const [dialog, setDialog] = useState<Dialog>(null);

    const [busy, setBusy] = useState(false);

    const onFile = async (file: File) => {
        setBusy(true);

        try {
            const seconds = await readAudioDuration(file);

            if (seconds !== null && seconds > MAX_SOUND_SECONDS)
                throw new Error(API_ERRORS.SOUND_FILE_INVALID);

            const name = file.name
                .replace(/\.[^.]+$/, '')
                .trim()
                .slice(0, SOUND_NAME_MAX)
                .trim();

            await upload.mutateAsync({
                file,
                name: name || t('upload.defaultName'),
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
        <>
            <HiddenFileInput
                ref={input}
                accept={`${TRACK_FILE_ACCEPT},.webm,audio/webm`}
                inputLabel={t('upload.fileLabel')}
                onFile={(file) => void onFile(file)}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" disabled={busy}>
                        <Plus />
                        {busy ? t('upload.pending') : t('add.button')}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => input.current?.click()}>
                        <FileAudio />
                        {t('add.file')}
                    </DropdownMenuItem>
                    {isRecorderSupported() && (
                        <DropdownMenuItem onSelect={() => setDialog('record')}>
                            <Mic />
                            {t('add.record')}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => setDialog('link')}>
                        <Link2 />
                        {t('add.link')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <RecordDialog
                open={dialog === 'record'}
                onClose={() => setDialog(null)}
            />
            <LinkDialog
                open={dialog === 'link'}
                onClose={() => setDialog(null)}
            />
        </>
    );
}
