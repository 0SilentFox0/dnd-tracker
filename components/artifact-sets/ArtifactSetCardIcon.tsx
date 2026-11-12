import { useTranslations } from 'next-intl';
import { Layers } from 'lucide-react';

import { ZoomableEntityIcon } from '@/components/common/ZoomableEntityIcon';
import { cn } from '@/lib/utils';

export interface ArtifactSetCardIconProps {
    url: string | null | undefined;
    name: string;
    className?: string;
    size?: 'md' | 'lg';
}

const SIZE = {
    md: { frame: 'size-14', glyph: 'size-7', px: 96 },
    lg: { frame: 'size-20', glyph: 'size-9', px: 96 },
} as const;

export function ArtifactSetCardIcon({
    url,
    name,
    className,
    size = 'md',
}: ArtifactSetCardIconProps) {
    const t = useTranslations('artifacts.sets.card');

    const { frame, glyph, px } = SIZE[size];

    return (
        <ZoomableEntityIcon
            src={url?.trim()}
            name={name}
            alt={t('iconAlt', { name })}
            size={px}
            className={cn(
                'rounded-lg border border-hud-line bg-hud-field text-hud-muted',
                frame,
                className
            )}
            fallback={<Layers className={glyph} aria-hidden />}
        />
    );
}
