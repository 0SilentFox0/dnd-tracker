import type { GameIconProps } from '../game/types';

export function RailReserveIcon({ className }: GameIconProps) {
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
            <path d="M5 4v17.5" />
            <circle cx="5" cy="2.8" r="1.2" fill="currentColor" />
            <path
                d="M5 4.5h14.5l-3.2 4.2 3.2 4.3H5z"
                fill="currentColor"
                fillOpacity=".3"
            />
            <path d="M8.5 7.6l3 2.2 3-2.2" strokeOpacity=".8" />
            <path d="M8.5 10.6l3 2.2 3-2.2" strokeOpacity=".5" />
            <path d="M2.5 21.5h5" />
        </svg>
    );
}
