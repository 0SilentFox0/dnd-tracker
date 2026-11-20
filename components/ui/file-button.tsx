'use client';

import { type ComponentProps, type Ref, useRef } from 'react';

import { Button } from '@/components/ui/button';

type FileButtonProps = Omit<ComponentProps<typeof Button>, 'onClick'> & {
    accept: string;
    inputLabel: string;
    onFile: (file: File) => void;
};

function HiddenFileInput({
    ref,
    accept,
    inputLabel,
    onFile,
    disabled,
}: {
    ref?: Ref<HTMLInputElement>;
    accept: string;
    inputLabel: string;
    onFile: (file: File) => void;
    disabled?: boolean;
}) {
    return (
        <input
            ref={ref}
            type="file"
            accept={accept}
            className="sr-only"
            aria-label={inputLabel}
            disabled={disabled}
            onChange={(event) => {
                const file = event.currentTarget.files?.[0];

                event.currentTarget.value = '';

                if (file) onFile(file);
            }}
        />
    );
}

function FileButton({
    accept,
    inputLabel,
    onFile,
    disabled,
    ...props
}: FileButtonProps) {
    const input = useRef<HTMLInputElement>(null);

    return (
        <span className="relative inline-flex">
            <HiddenFileInput
                ref={input}
                accept={accept}
                inputLabel={inputLabel}
                onFile={onFile}
                disabled={disabled}
            />
            <Button
                type="button"
                disabled={disabled}
                onClick={() => input.current?.click()}
                {...props}
            />
        </span>
    );
}

export { FileButton, HiddenFileInput };
