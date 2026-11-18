import * as React from 'react';

import { cn } from '@/lib/utils';

function Radio({
    className,
    ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
    return (
        <input
            type="radio"
            data-slot="radio"
            className={cn('size-4 shrink-0 accent-primary', className)}
            {...props}
        />
    );
}

export { Radio };
