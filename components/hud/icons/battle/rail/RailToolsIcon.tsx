import type { GameIconProps } from '../game/types';

export function RailToolsIcon({ className }: GameIconProps) {
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
            <rect
                x="11"
                y="3"
                width="9"
                height="5"
                rx="1"
                transform="rotate(45 15.5 5.5)"
                fill="currentColor"
                fillOpacity=".35"
            />
            <path d="M15.5 8L4.5 19" strokeWidth="2" />
            <path d="M12.5 11.5l2 2" strokeOpacity=".6" />
            <path
                d="M3.5 3.5l2.4 5.8 3.4-3.4z"
                fill="currentColor"
                fillOpacity=".7"
            />
            <path d="M8 8l11 11" strokeWidth="2.2" />
            <circle cx="20" cy="20" r="1.1" fill="currentColor" />
        </svg>
    );
}
