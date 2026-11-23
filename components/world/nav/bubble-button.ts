import { cn } from '@/lib/utils';

const BASE =
    'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-xs transition-colors disabled:opacity-40';

export const bubbleButton = (danger = false, className?: string) =>
    cn(
        BASE,
        danger
            ? 'border-hud-danger/50 text-hud-danger hover:bg-hud-danger/15'
            : 'border-hud-rule bg-hud-field text-hud-ink hover:bg-hud-raised',
        className
    );

export const BUBBLE_ACTIONS = 'grid grid-cols-2 gap-1.5';
