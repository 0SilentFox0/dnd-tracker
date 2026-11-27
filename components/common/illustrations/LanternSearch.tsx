import { ACCENT, Illustration, type IllustrationProps } from './Illustration';

export function LanternSearch(props: IllustrationProps) {
    return (
        <Illustration {...props}>
            <path
                d="M12 96 L52 84 L92 96 L132 84 L148 90 L148 112 L12 112 Z"
                opacity={0.5}
            />
            <path
                d="M52 84 L52 112 M92 96 L92 112 M132 84 L132 112"
                opacity={0.35}
            />
            <path d="M72 14 C72 8 88 8 88 14" />
            <path d="M80 8 L80 4" />
            <path d="M68 20 L92 20 L96 52 L64 52 Z" />
            <path d="M64 52 L96 52 L92 58 L68 58 Z" />
            <path
                d="M80 28 C74 36 76 44 80 46 C84 44 86 36 80 28 Z"
                stroke={ACCENT}
            />
            <path
                d="M54 62 L40 76 M80 64 L80 80 M106 62 L120 76"
                stroke={ACCENT}
                opacity={0.6}
            />
        </Illustration>
    );
}
