'use client';

import { useTranslations } from 'next-intl';

import { FileButton } from '@/components/ui/file-button';
import type { UvttImportFailure } from '@/lib/hooks/battle-maps';
import type { UvttWarning } from '@/lib/utils/battle/uvtt/parse';

export function UvttImportSection({
    error,
    warnings,
    onFile,
}: {
    error: UvttImportFailure | null;
    warnings: UvttWarning[];
    onFile: (file: File) => void;
}) {
    const t = useTranslations('maps.editor');

    return (
        <div className="mb-3 space-y-2">
            <FileButton
                accept=".dd2vtt,.uvtt,application/json"
                inputLabel={t('import.chooseFile')}
                onFile={onFile}
                variant="outline"
                size="sm"
            >
                {t('import.button')}
            </FileButton>
            <p className="text-xs text-hud-muted">{t('import.help')}</p>
            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {'key' in error ? t(`import.${error.key}`) : error.message}
                </p>
            ) : null}
            {warnings.length > 0 ? (
                <ul
                    role="status"
                    className="space-y-0.5 text-xs text-hud-ink"
                >
                    {warnings.map(({ code, count }) => (
                        <li key={code}>
                            {t(`import.warnings.${code}`, { count })}
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
