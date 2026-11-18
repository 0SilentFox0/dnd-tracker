'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { type CompendiumPhase, compendiumPhaseOf } from './compendium-phase';
import { compendiumRunOpener } from './compendiumRunOpener';
import { compendiumKeys } from './keys';
import { useCompendiumMedia } from './useCompendiumMedia';
import { useCompendiumRequests } from './useCompendiumRequests';
import { useCompendiumSelection } from './useCompendiumSelection';

import type { JsonRecord } from '@/lib/constants/compendium-import';
import { useTranslator } from '@/lib/i18n/use-translator';
import { readCompendiumFile } from '@/lib/utils/compendium-import/file';
import {
    categoryInventory,
    compendiumErrorMessage,
    excludeAllBlocked,
    projectInput,
} from '@/lib/utils/compendium-import/flow';
import { reportMediaProgress } from '@/lib/utils/compendium-import/media-loop';
import type {
    CompendiumOptions,
    CompendiumPreview,
    CompendiumReport,
    ImportInput,
} from '@/types/compendium-import';

export type { CompendiumPhase };

export function useCompendiumImport(campaignId: string, initialFile?: File) {
    const queryClient = useQueryClient();

    const t = useTranslator('compendium');

    const [root, setRoot] = useState<JsonRecord | null>(null);

    const [options, setOptions] = useState<CompendiumOptions>({});

    const [preview, setPreview] = useState<CompendiumPreview | null>(null),
        [input, setInput] = useState<ImportInput | null>(null),
        [result, setResult] = useState<CompendiumReport | null>(null);

    const [rights, setRights] = useState(false),
        [reading, setReading] = useState(false),
        [failure, setFailure] = useState<{
            error?: unknown;
            key: string;
        } | null>(null);

    const key = useRef(''),
        controller = useRef<AbortController | null>(null);

    const media = useCompendiumMedia(campaignId);

    const requests = useCompendiumRequests(campaignId, !!preview);

    const busy =
        reading ||
        requests.preview.isPending ||
        requests.confirm.isPending ||
        requests.openRun.isPending;

    useEffect(() => () => controller.current?.abort(), []);

    const invalidate = useCallback(() => {
        setPreview(null);
        setInput(null);
        setResult(null);
        setRights(false);
        key.current = '';
    }, []);

    const {
        categories,
        excludedChapters,
        setCategories,
        setExcludedChapters,
        toggleCategory,
        selectCategories,
        toggleChapter,
        setChapterExclusions,
    } = useCompendiumSelection(invalidate);

    const startRequest = () => {
        controller.current?.abort();

        controller.current = new AbortController();

        return controller.current;
    };

    const changeOptions = (value: CompendiumOptions) => {
        setOptions(value);
        invalidate();
    };

    const selectFile = useCallback(
        async (file: File) => {
            const abort = startRequest();

            setReading(true);
            setFailure(null);
            setRoot(null);
            invalidate();
            setOptions({});
            setExcludedChapters([]);
            try {
                const parsed = await readCompendiumFile(file, abort.signal);

                if (abort.signal.aborted) return;

                setRoot(parsed);
                setCategories(
                    categoryInventory(parsed)
                        .filter((row) => row.selected)
                        .map((row) => row.kind)
                );
            } catch (e) {
                if (!abort.signal.aborted)
                    setFailure({ error: e, key: 'errors.readFailed' });
            } finally {
                if (!abort.signal.aborted) setReading(false);
            }
        },
        [invalidate, setCategories, setExcludedChapters]
    );

    useEffect(() => {
        if (initialFile) void selectFile(initialFile);
    }, [initialFile, selectFile]);

    async function runPreview(nextOptions = options) {
        if (!root) return;

        setFailure(null);
        invalidate();

        const abort = startRequest();

        try {
            const next = projectInput(
                root,
                categories,
                nextOptions,
                excludedChapters
            );

            const data = await requests.preview.mutateAsync({
                next,
                signal: abort.signal,
            });

            if (abort.signal.aborted) return;

            setPreview(data);
            setInput(next);
            key.current = crypto.randomUUID();
        } catch (e) {
            if (!abort.signal.aborted)
                setFailure({ error: e, key: 'errors.previewFailed' });
        }
    }

    async function confirm() {
        if (!preview || !input || !rights || busy) return;

        setFailure(null);

        const abort = startRequest();

        try {
            const report = await requests.confirm.mutateAsync({
                body: {
                    input,
                    token: preview.token,
                    idempotencyKey: key.current,
                    rightsConfirmed: rights,
                },
                signal: abort.signal,
            });

            if (abort.signal.aborted) return;

            setResult(report);
            setPreview(null);
            setInput(null);
            setRoot(null);
            setOptions({});

            const queued = reportMediaProgress(report);

            if (queued && queued.pending > 0) media.start(queued);

            void queryClient.invalidateQueries({
                queryKey: compendiumKeys.all(campaignId),
            });
        } catch (e) {
            if (!abort.signal.aborted)
                setFailure({ error: e, key: 'errors.confirmFailed' });
        }
    }

    function applyExclusion(next: CompendiumOptions) {
        setOptions(next);
        void runPreview(next);
    }

    const excludeBlockedRows = () => {
        if (preview)
            applyExclusion(
                excludeAllBlocked(
                    options,
                    preview.graph,
                    preview.report.nextActions
                )
            );
    };

    const excludeRow = (rowKey: string) =>
        applyExclusion({
            ...options,
            excludedKeys: [...(options.excludedKeys ?? []), rowKey],
        });

    const openRun = compendiumRunOpener({
        media,
        invalidate,
        reset: () => setRoot(null),
        setResult,
        setFailure,
        load: requests.openRun.mutateAsync,
    });

    const close = () => {
        controller.current?.abort();
        media.stop();
        setReading(false);
        setRoot(null);
        setCategories([]);
        setOptions({});
        invalidate();
    };

    const phase = compendiumPhaseOf({
        reading,
        previewing: requests.preview.isPending,
        confirming: requests.confirm.isPending,
        media: media.running,
        opening: requests.openRun.isPending,
    });

    return {
        state: {
            root,
            categories,
            excludedChapters,
            options,
            preview,
            input,
            result,
            rights,
            targets: requests.targetList,
            busy,
            phase,
            media: media.progress,
            mediaPaused: media.paused,
            error: failure
                ? compendiumErrorMessage(t, failure.error, failure.key)
                : requests.targets.isError && preview
                  ? t('errors.optionsLoadFailed')
                  : '',
        },
        actions: {
            selectFile,
            changeOptions,
            applyOptions: applyExclusion,
            setOptions,
            toggleCategory,
            selectCategories,
            toggleChapter,
            setChapterExclusions,
            setRights,
            runPreview,
            confirm,
            excludeBlockedRows,
            excludeRow,
            openRun,
            close,
            media: {
                resume: media.resume,
                retryFailed: media.retryFailed,
                stop: media.stop,
            },
        },
    };
}

export type CompendiumImportController = ReturnType<typeof useCompendiumImport>;
