import type { GameIconProps } from '../game/types';

export function RailDmIcon({ className }: GameIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            <path
                d="M3 19.5L2 8l5 4 5-7 5 7 5-4-1 11.5z"
                fill="currentColor"
                fillOpacity=".25"
            />
            <path d="M3.4 16.5h17.2" strokeOpacity=".7" />
            <circle cx="12" cy="4.8" r="1.1" fill="currentColor" />
            <circle cx="2.2" cy="7.6" r="0.9" fill="currentColor" />
            <circle cx="21.8" cy="7.6" r="0.9" fill="currentColor" />
            <path
                d="M12 17.3l1 1-1 1-1-1z"
                fill="currentColor"
                strokeWidth="0.8"
            />
            <circle cx="7.5" cy="18" r="0.7" fill="currentColor" />
            <circle cx="16.5" cy="18" r="0.7" fill="currentColor" />
        </svg>
    );
}
