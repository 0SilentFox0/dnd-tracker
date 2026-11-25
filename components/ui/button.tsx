import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const OUTLINE =
    'bg-hud-panel-2 border border-hud-line text-hud-ink shadow-[inset_0_1px_0_var(--hud-hi),var(--hud-sh-btn)] hover:border-hud-muted';

const buttonVariants = cva(
    "hud-body cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-[15px] transition-[transform,box-shadow] active:translate-y-px active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:border-hud-crimson",
    {
        variants: {
            variant: {
                default:
                    'hud-sc text-[17px] bg-hud-crimson text-hud-crimson-ink border border-hud-crimson-2 shadow-[inset_0_1px_0_rgba(255,255,255,.2),inset_0_-2px_0_rgba(0,0,0,.2)]',
                destructive: `${OUTLINE} text-hud-crimson-fg`,
                outline: OUTLINE,
                secondary: OUTLINE,
                ghost: 'text-hud-muted hover:text-hud-ink',
                link: 'text-hud-muted underline-offset-4 hover:text-hud-ink hover:underline',
            },
            size: {
                default: 'h-11 px-4 py-2 has-[>svg]:px-3',
                sm: 'h-10 gap-1.5 px-3 has-[>svg]:px-2.5',
                lg: 'h-12 px-6 sm:h-[52px] has-[>svg]:px-4',
                icon: 'size-10',
                'icon-sm': 'size-10',
                'icon-lg': 'size-11',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

function Button({
    className,
    variant = 'default',
    size = 'default',
    asChild = false,
    ...props
}: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="button"
            data-variant={variant}
            data-size={size}
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
