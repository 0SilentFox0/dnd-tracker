import { ACCENT, Illustration, type IllustrationProps } from './Illustration';

export function BlankTome(props: IllustrationProps) {
    return (
        <Illustration {...props}>
            <path d="M80 36 C62 26 38 26 20 32 L20 92 C38 86 62 86 80 96 C98 86 122 86 140 92 L140 32 C122 26 98 26 80 36 Z" />
            <path d="M80 36 L80 96" />
            <path d="M20 92 C38 98 62 98 80 106 C98 98 122 98 140 92" />
            <path
                d="M32 46 C44 43 56 44 68 48 M32 58 C44 55 56 56 68 60 M92 48 C104 44 116 43 128 46"
                opacity={0.45}
            />
            <path d="M80 36 L80 14 L88 20 L96 14 L96 40" stroke={ACCENT} />
        </Illustration>
    );
}
