export function StrikeReturnIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            <path d="M4 4l9 9M8 13l3 3M6 18l-2 2" />
            <path d="M20 7v4a4 4 0 0 1-4 4h-4M14.5 12.5 12 15l2.5 2.5" />
        </svg>
    );
}
