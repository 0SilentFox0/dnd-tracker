import type { CompendiumMediaController } from './useCompendiumMedia';

import { reportMediaProgress } from '@/lib/utils/compendium-import/media-loop';
import type {
    CompendiumReport,
    CompendiumRun,
} from '@/types/compendium-import';

interface RunOpenerContext {
    media: CompendiumMediaController;
    invalidate(): void;
    reset(): void;
    setResult(report: CompendiumReport): void;
    setFailure(failure: { key: string } | null): void;
    load(runId: string): Promise<{ runs: { report: CompendiumReport }[] }>;
}

export const compendiumRunOpener =
    ({
        media,
        invalidate,
        reset,
        setResult,
        setFailure,
        load,
    }: RunOpenerContext) =>
    async (run: CompendiumRun) => {
        const showReport = (report: CompendiumReport) => {
            setResult(report);

            const loaded = reportMediaProgress(report);

            if (loaded) media.load(loaded);
        };

        invalidate();
        reset();
        media.stop();

        if (run.report) return showReport(run.report);

        setFailure(null);
        try {
            const data = await load(run.id);

            if (data.runs[0]) showReport(data.runs[0].report);
            else setFailure({ key: 'errors.reportUnavailable' });
        } catch {
            setFailure({ key: 'errors.reportLoadFailed' });
        }
    };
