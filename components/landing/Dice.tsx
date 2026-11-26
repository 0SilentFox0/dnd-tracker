const INK = '#e6dccb';

export function D20({
    value,
    className,
}: {
    value: string;
    className?: string;
}) {
    return (
        <svg viewBox="0 0 100 100" aria-hidden className={className}>
            <polygon
                points="50,3 93,27 93,73 50,97 7,73 7,27"
                fill="#7a1b12"
                stroke="#ffcf7a"
                strokeWidth="3"
            />
            <polygon
                points="50,22 78,68 22,68"
                fill="#a3281b"
                stroke="#ffcf7a"
                strokeWidth="2"
            />
            <path
                d="M50 3 50 22 M93 27 78 68 M7 27 22 68 M50 97 22 68 M50 97 78 68 M93 73 78 68 M7 73 22 68 M7 27 50 22 93 27"
                stroke="#ffcf7a"
                strokeWidth="1.5"
                strokeOpacity=".6"
                fill="none"
            />
            <text
                x="50"
                y="58"
                textAnchor="middle"
                fontSize="22"
                fontWeight="700"
                fill="#fff4dc"
                fontFamily="Georgia, serif"
            >
                {value}
            </text>
        </svg>
    );
}

function D10({ value, x, fill }: { value: string; x: number; fill: string }) {
    return (
        <g transform={`translate(${x} 0)`}>
            <polygon
                points="30,4 56,40 30,96 4,40"
                fill={fill}
                stroke="#c9b37a"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
            <path
                d="M30 4 30 30 M4 40 30 30 56 40 M30 30 30 96"
                stroke="#c9b37a"
                strokeWidth="1.2"
                strokeOpacity=".55"
                fill="none"
            />
            <text
                x="30"
                y="62"
                textAnchor="middle"
                fontSize="17"
                fontWeight="700"
                fill={INK}
                fontFamily="Georgia, serif"
            >
                {value}
            </text>
        </g>
    );
}

export function D100({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 118 100" aria-hidden className={className}>
            <D10 value="00" x={0} fill="#2b2f33" />
            <D10 value="7" x={58} fill="#4a2a22" />
        </svg>
    );
}

export function D6({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" aria-hidden className={className}>
            <polygon
                points="50,6 92,28 92,74 50,96 8,74 8,28"
                fill="#1d1813"
                stroke="#c9b37a"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
            <path
                d="M8 28 50 50 92 28 M50 50 50 96"
                stroke="#c9b37a"
                strokeWidth="1.5"
                strokeOpacity=".6"
                fill="none"
            />
            <g fill={INK}>
                <circle cx="50" cy="27" r="4.5" />
                <circle cx="27" cy="52" r="4" />
                <circle cx="35" cy="73" r="4" />
                <circle cx="66" cy="57" r="4" />
                <circle cx="74" cy="72" r="4" />
                <circle cx="73" cy="42" r="4" />
            </g>
        </svg>
    );
}

export const SYSTEM_DICE = {
    srd: ({ className }: { className?: string }) => (
        <D20 value="20" className={className} />
    ),
    grim: D100,
    custom: D6,
};
