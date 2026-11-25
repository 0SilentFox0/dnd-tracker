import type { GameIconProps } from '../game/types';

export function RailLogIcon({ className }: GameIconProps) {
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
                d="M5.5 3h11a1.5 1.5 0 0 1 0 3h-11a1.5 1.5 0 0 1 0-3z"
                fill="currentColor"
                fillOpacity=".3"
            />
            <path d="M6.5 6v11.5A2.5 2.5 0 0 0 9 20h8a2 2 0 0 0 2-2V6" />
            <path d="M9.5 10h6M9.5 13h4" strokeOpacity=".7" />
            <circle
                cx="16.5"
                cy="17"
                r="2.3"
                fill="currentColor"
                fillOpacity=".85"
            />
            <circle cx="16.5" cy="17" r="1" strokeOpacity=".5" />
            <path
                d="M21.5 8.5c-3 .3-5.3 2-6.3 4.8l1.3 1.2c2.7-1 4.4-3.3 5-6z"
                fill="currentColor"
                fillOpacity=".45"
            />
            <path d="M15.7 14.3L13.8 16.4" />
        </svg>
    );
}
