import * as React from 'react';

import { FIELD_CLASS, TEXTAREA_CLASS } from '@/components/ui/field-class';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                'hud-body flex field-sizing-content outline-none disabled:cursor-not-allowed',
                FIELD_CLASS,
                TEXTAREA_CLASS,
                className
            )}
            {...props}
        />
    );
}

export { Textarea };
