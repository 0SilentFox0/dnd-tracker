'use client';

import { type ComponentProps, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TRACK_FILE_ACCEPT } from '@/lib/constants/music';

export function UploadTrackButton({
    onFile,
    pending,
    size,
    className,
}: {
    onFile: (file: File) => void;
    pending: boolean;
    size?: ComponentProps<typeof Button>['size'];
    className?: string;
}) {
    const t = useTranslations('music');

    const input = useRef<HTMLInputElement>(null);

    return (
        <>
            <Input
                ref={input}
                type="file"
                accept={TRACK_FILE_ACCEPT}
                hidden
                aria-label={t('upload.fileLabel')}
                onChange={(e) => {
                    const file = e.target.files?.[0];

                    e.target.value = '';

                    if (file) onFile(file);
                }}
            />
            <Button
                onClick={() => input.current?.click()}
                disabled={pending}
                size={size}
                className={className}
            >
                <Upload />
                {pending ? t('upload.pending') : t('upload.button')}
            </Button>
        </>
    );
}
