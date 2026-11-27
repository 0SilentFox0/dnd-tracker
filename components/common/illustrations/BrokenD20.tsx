import { ACCENT, Illustration, type IllustrationProps } from './Illustration';

export function BrokenD20(props: IllustrationProps) {
    return (
        <Illustration {...props}>
            <path d="M80 12 L129 40 L129 84 L80 108 L31 84 L31 40 Z" />
            <path d="M80 12 L62 56 L31 40 M80 12 L98 56 L129 40" />
            <path d="M31 84 L62 56 L98 56 L129 84 M62 56 L80 108 L98 56" />
            <path
                d="M84 22 L76 46 L86 58 L78 80 L84 106"
                stroke={ACCENT}
                strokeWidth={2}
            />
            <text
                x="80"
                y="78"
                textAnchor="middle"
                fontSize="22"
                fontWeight="700"
                fill={ACCENT}
                stroke="none"
                style={{ fontFamily: 'var(--font-hud-sc), serif' }}
            >
                1
            </text>
            <path d="M138 30 l6 -6 M146 44 l8 -2 M20 60 l-8 2" />
        </Illustration>
    );
}
