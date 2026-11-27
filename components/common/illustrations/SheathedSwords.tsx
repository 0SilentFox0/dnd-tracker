import { ACCENT, Illustration, type IllustrationProps } from './Illustration';

export function SheathedSwords(props: IllustrationProps) {
    return (
        <Illustration {...props}>
            <path d="M36 100 L110 26 M110 26 L122 20 L116 32 Z" />
            <path d="M28 92 L44 108 M32 112 L24 104" />
            <path d="M124 100 L50 26 M50 26 L38 20 L44 32 Z" />
            <path d="M132 92 L116 108 M128 112 L136 104" />
            <circle cx="80" cy="63" r="6" stroke={ACCENT} />
        </Illustration>
    );
}
