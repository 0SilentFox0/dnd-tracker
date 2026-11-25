import * as React from 'react';

import { cn } from '@/lib/utils';

type SliderProps = Omit<
    React.ComponentProps<'input'>,
    'type' | 'value' | 'min' | 'max' | 'step' | 'onChange'
> & {
    value: number;
    min: number;
    max: number;
    step?: number;
    onValueChange: (value: number) => void;
};

function Slider({
    className,
    step = 1,
    onValueChange,
    ...props
}: SliderProps) {
    return (
        <input
            type="range"
            data-slot="slider"
            step={step}
            onChange={(e) => onValueChange(Number(e.target.value))}
            className={cn(
                'h-4 min-w-0 cursor-pointer accent-hud-crimson focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        />
    );
}

export { Slider };
