'use client';
import { type DragEvent, type ReactNode, useRef, useState } from 'react';
import { FileJson, Loader2, Upload } from 'lucide-react';

import { HudButton } from '@/components/hud/HudButton';
import { FileButton, HiddenFileInput } from '@/components/ui/file-button';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/utils/common/format';

type DropFile = {
    name: string;
    size: number;
    meta?: ReactNode;
    replaceLabel: string;
};

export function FileDropZone({
    accept,
    onFile,
    label,
    hint,
    file,
    disabled,
    busy,
}: {
    accept: string;
    onFile: (f: File) => void;
    label: string;
    hint?: ReactNode;
    file?: DropFile | null;
    disabled?: boolean;
    busy?: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);

    const [over, setOver] = useState(false);

    const locked = !!disabled || !!busy;

    const over$ = (e: DragEvent) => {
        e.preventDefault();

        if (!locked) setOver(true);
    };

    const drop = (e: DragEvent) => {
        e.preventDefault();
        setOver(false);

        const dropped = e.dataTransfer.files[0];

        if (!locked && dropped) onFile(dropped);
    };

    return (
        <div
            data-slot="file-drop-zone"
            data-over={over || undefined}
            className={cn(
                'ds-inset border-2 border-dashed transition-colors',
                over || !locked
                    ? 'border-hud-accent/40 hover:border-hud-accent'
                    : 'border-hud-rule opacity-60',
                over && 'border-hud-accent'
            )}
            onDragEnter={over$}
            onDragOver={over$}
            onDragLeave={() => setOver(false)}
            onDrop={drop}
        >
            {file ? (
                <div className="flex flex-wrap items-center gap-3 p-4">
                    {busy ? (
                        <Loader2
                            className="size-8 shrink-0 animate-spin text-hud-accent-fg"
                            aria-hidden
                        />
                    ) : (
                        <FileJson
                            className="size-8 shrink-0 text-hud-accent-fg"
                            aria-hidden
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-hud-ink">
                            {file.name}
                        </p>
                        <p className="text-xs text-hud-muted">
                            {formatBytes(file.size)}
                            {file.meta ? <> · {file.meta}</> : null}
                        </p>
                    </div>
                    <FileButton
                        variant="outline"
                        size="sm"
                        accept={accept}
                        inputLabel={file.replaceLabel}
                        disabled={locked}
                        onFile={onFile}
                    >
                        {file.replaceLabel}
                    </FileButton>
                </div>
            ) : (
                <>
                    <HiddenFileInput
                        ref={input}
                        accept={accept}
                        inputLabel={label}
                        disabled={locked}
                        onFile={onFile}
                    />
                    <HudButton
                        disabled={locked}
                        className="flex w-full flex-col items-center gap-2 rounded-xl p-8 text-center disabled:cursor-not-allowed"
                        onClick={() => input.current?.click()}
                    >
                        {busy ? (
                            <Loader2
                                className="size-8 animate-spin text-hud-accent-fg"
                                aria-hidden
                            />
                        ) : (
                            <Upload
                                className="size-8 text-hud-accent-fg"
                                aria-hidden
                            />
                        )}
                        <span className="text-sm text-hud-ink">{label}</span>
                        {hint && (
                            <span className="text-xs text-hud-muted">
                                {hint}
                            </span>
                        )}
                    </HudButton>
                </>
            )}
        </div>
    );
}
