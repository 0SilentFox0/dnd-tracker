'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mic, Square } from 'lucide-react';

import { SoundIconPicker } from './SoundIconPicker';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { MAX_SOUND_SECONDS, SOUND_NAME_MAX } from '@/lib/constants/soundboard';
import { useNotify } from '@/lib/hooks/common';
import { useLibraryMutations, useSoundRecorder } from '@/lib/hooks/soundboard';
import { translateIssue } from '@/lib/i18n/translate-issue';
import { useTranslator } from '@/lib/i18n/use-translator';
import { decodeDurationMs } from '@/lib/utils/soundboard/decode-duration';

function RecordForm({ onClose }: { onClose: () => void }) {
    const t = useTranslations('soundboard');

    const tr = useTranslator();

    const notify = useNotify();

    const recorder = useSoundRecorder();

    const { upload } = useLibraryMutations();

    const [name, setName] = useState(t('record.defaultName'));

    const [icon, setIcon] = useState('mic');

    const { result } = recorder;

    const previewUrl = useMemo(
        () => (result ? URL.createObjectURL(result) : null),
        [result]
    );

    useEffect(
        () => () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        },
        [previewUrl]
    );

    const save = async () => {
        if (!result) return;

        try {
            const durationMs = await decodeDurationMs(result).catch(
                () => recorder.elapsedMs
            );

            await upload.mutateAsync({
                file: result,
                name: name.trim() || t('record.defaultName'),
                icon,
                durationMs,
                source: 'record',
            });

            onClose();
        } catch (error) {
            void notify(
                translateIssue(tr, {
                    message:
                        error instanceof Error
                            ? error.message
                            : 'soundboard.uploadFailed',
                })
            );
        }
    };

    const failure =
        recorder.state === 'denied'
            ? t('record.denied')
            : recorder.state === 'error'
              ? t('record.error')
              : null;

    return (
        <ResponsiveDialog
            hud
            open
            onOpenChange={(open) => !open && onClose()}
            title={t('record.title')}
            description={t('record.hint', { seconds: MAX_SOUND_SECONDS })}
            footer={
                <Button
                    disabled={!result || upload.isPending}
                    onClick={() => void save()}
                >
                    {t('record.save')}
                </Button>
            }
        >
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    {recorder.state === 'recording' ? (
                        <Button variant="destructive" onClick={recorder.stop}>
                            <Square />
                            {t('record.stop')}
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => void recorder.start()}
                        >
                            <Mic />
                            {result ? t('record.again') : t('record.start')}
                        </Button>
                    )}
                    <span className="text-sm text-hud-muted tabular-nums">
                        {(recorder.elapsedMs / 1000).toFixed(1)} s
                    </span>
                </div>
                {failure && (
                    <p role="alert" className="text-sm text-destructive">
                        {failure}
                    </p>
                )}
                {previewUrl && (
                    <audio
                        controls
                        src={previewUrl}
                        aria-label={t('record.preview')}
                        className="w-full"
                    />
                )}
                {result && (
                    <>
                        <label className="flex flex-col gap-1 text-xs text-hud-muted">
                            {t('record.name')}
                            <Input
                                value={name}
                                maxLength={SOUND_NAME_MAX}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </label>
                        <SoundIconPicker
                            value={icon}
                            onChange={setIcon}
                            label={t('edit.icon')}
                        />
                    </>
                )}
            </div>
        </ResponsiveDialog>
    );
}

export function RecordDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    return open ? <RecordForm onClose={onClose} /> : null;
}
