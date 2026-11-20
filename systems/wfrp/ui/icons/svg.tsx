import type { LucideIcon } from 'lucide-react';

import type { WfrpIcon, WfrpIconProps } from './types';

export const STROKE = 1.75;

export function Drawn({
    size = 24,
    children,
    ...rest
}: WfrpIconProps & { children: React.ReactNode }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...rest}
        >
            {children}
        </svg>
    );
}

export const fromLucide = (Icon: LucideIcon): WfrpIcon =>
    function WfrpLucideIcon(props) {
        return <Icon strokeWidth={STROKE} aria-hidden="true" {...props} />;
    };
