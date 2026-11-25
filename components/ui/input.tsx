import * as React from 'react';

import { FIELD_CLASS } from '@/components/ui/field-class';
import { cn } from '@/lib/utils';

function Input({
    className,
    type,
    ...props
}: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                'hud-body min-w-0 outline-none selection:bg-hud-crimson selection:text-hud-crimson-ink file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-hud-ink disabled:pointer-events-none disabled:cursor-not-allowed',
                FIELD_CLASS,
                className
            )}
            {...props}
        />
    );
}

export { Input };
