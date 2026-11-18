'use client';

import { type ComponentProps, useRef } from 'react';

import { Button } from '@/components/ui/button';

type FileButtonProps = Omit<ComponentProps<typeof Button>, 'onClick'> & {
    accept: string;
    inputLabel: string;
    onFile: (file: File) => void;
};

function FileButton({
    accept,
    inputLabel,
    onFile,
    disabled,
    ...props
}: FileButtonProps) {
    const input = useRef<HTMLInputElement>(null);

    return (
        <>
            <input
                ref={input}
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
            <Button
                type="button"
                disabled={disabled}
                onClick={() => input.current?.click()}
                {...props}
            />
        </>
    );
}

export { FileButton };
