import { type Dispatch, type SetStateAction, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { contentImportKeys } from './keys';

import {
    getImportAiAvailability,
    suggestImportMapping,
} from '@/lib/api/content-import';
import { useTranslator } from '@/lib/i18n/use-translator';
import { errorMessage } from '@/lib/utils/common/error-message';
import { IMPORT_LIMITS } from '@/lib/utils/content/import';
import { aiSample } from '@/lib/utils/content/import/wizard';
import type {
    ImportKind,
    ImportMapping,
    ParsedTable,
} from '@/types/content-import';

export function useImportAiMapping({
    campaignId,
    kind,
    enabled,
    table,
    setMapping,
    setError,
}: {
    campaignId: string;
    kind: ImportKind;
    enabled: boolean;
    table: ParsedTable | null;
    setMapping: Dispatch<SetStateAction<ImportMapping>>;
    setError(message: string | null): void;
}) {
    const t = useTranslator();

    const [busy, setBusy] = useState(false);

    const [notes, setNotes] = useState<string[]>([]);

    const availability = useQuery({
        queryKey: contentImportKeys.aiAvailability(campaignId, kind),
        queryFn: () => getImportAiAvailability(campaignId, kind),
        staleTime: 5 * 60_000,
        enabled,
    });

    async function suggest() {
        if (!table) return;

        setBusy(true);
        setError(null);

        try {
            const res = await suggestImportMapping(campaignId, kind, {
                headers: table.headers.slice(0, IMPORT_LIMITS.aiHeaders),
                sample: aiSample(table),
            });

            setMapping((current) => ({
                ...current,
                ...Object.fromEntries(
                    Object.entries(res.mapping).filter(
                        ([header, key]) =>
                            key !== null && Object.hasOwn(current, header)
                    )
                ),
            }));
            setNotes(res.notes);
        } catch (e) {
            setError(errorMessage(e, t('contentImport.errors.aiFailed')));
        } finally {
            setBusy(false);
        }
    }

    return {
        available: availability.data?.available ?? false,
        busy,
        notes,
        suggest,
        clearNotes: () => setNotes([]),
    };
}
