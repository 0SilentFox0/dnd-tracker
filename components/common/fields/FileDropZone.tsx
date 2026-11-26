'use client';

import { type DragEvent, type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FileButton } from '@/components/ui/file-button';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
    accept: string;
    onFiles: (files: File[]) => void;
    multiple?: boolean;
    disabled?: boolean;
    label: ReactNode;
    hint?: ReactNode;
    file?: {
        name: string;
        size: number;
        meta?: ReactNode;
        replaceLabel: ReactNode;
        onReplace: () => void;
    } | null;
}

export function acceptsFile(file: File, accept: string): boolean {
    const rules = accept
        .split(',')
        .map((rule) => rule.trim().toLowerCase())
        .filter(Boolean);

    if (rules.length === 0) return true;

    const name = file.name.toLowerCase();

    const type = file.type.toLowerCase();

    return rules.some((rule) => {
        if (rule.startsWith('.')) return name.endsWith(rule);

        if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));

        return type === rule;
    });
}

const SIZE = new Intl.NumberFormat(undefined, {
    notation: 'compact',
    style: 'unit',
    unit: 'byte',
    unitDisplay: 'narrow',
});

export function FileDropZone({
    accept,
    onFiles,
    multiple,
    disabled,
    label,
    hint,
    file,
}: FileDropZoneProps) {
    const [over, setOver] = useState(false);

    function onDrop(event: DragEvent) {
        event.preventDefault();
        setOver(false);

        if (disabled) return;

        const accepted = Array.from(event.dataTransfer.files).filter((item) =>
            acceptsFile(item, accept)
        );

        const files = multiple ? accepted : accepted.slice(0, 1);

        if (files.length > 0) onFiles(files);
    }

    return (
        <div
            data-testid="file-drop-zone"
            onDragOver={(event) => {
                event.preventDefault();

                if (!disabled) setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={cn(
                'ds-inset ds-interactive flex flex-col items-center gap-2 rounded-xl border border-dashed border-hud-line p-4 text-center hover:border-hud-accent',
                over && 'border-hud-accent',
                disabled && 'opacity-50'
            )}
        >
            {file ? (
                <div className="flex w-full items-center justify-between gap-3 text-left">
                    <div className="min-w-0">
                        <p className="truncate text-sm text-hud-ink">
                            {file.name}
                        </p>
                        <p className="text-xs text-hud-muted">
                            {SIZE.format(file.size)}
                            {file.meta && <> · {file.meta}</>}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={file.onReplace}
                    >
                        {file.replaceLabel}
                    </Button>
                </div>
            ) : (
                <>
                    <FileButton
                        accept={accept}
                        inputLabel={typeof label === 'string' ? label : accept}
                        disabled={disabled}
                        variant="outline"
                        onFile={(picked) => onFiles([picked])}
                    >
                        {label}
                    </FileButton>
                    {hint && <p className="text-xs text-hud-muted">{hint}</p>}
                </>
            )}
        </div>
    );
}
