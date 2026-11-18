'use client';

import { useCallback, useState } from 'react';

import {
    parseUvtt,
    type UvttImport,
    UvttImportError,
    type UvttWarning,
} from '@/lib/utils/battle/uvtt/parse';

const UVTT_EXTENSION = /\.(dd2vtt|uvtt)$/i;

export type UvttImportFailure =
    | { key: 'invalidExtension' | 'failed' }
    | { message: string };

export function useUvttImport(onImported: (result: UvttImport) => void) {
    const [error, setError] = useState<UvttImportFailure | null>(null);

    const [warnings, setWarnings] = useState<UvttWarning[]>([]);

    const importFile = useCallback(
        async (file: File) => {
            setError(null);
            setWarnings([]);
            try {
                if (!UVTT_EXTENSION.test(file.name)) {
                    setError({ key: 'invalidExtension' });

                    return;
                }

                const result = parseUvtt(await file.text());

                onImported(result);
                setWarnings(result.warnings);
            } catch (caught) {
                setError(
                    caught instanceof UvttImportError
                        ? { message: caught.message }
                        : { key: 'failed' }
                );
            }
        },
        [onImported]
    );

    return { error, warnings, importFile };
}
