import type { ReactNode } from 'react';
import Image from 'next/image';

import {
    type ShowcaseId,
    type ShowcaseMedia,
    showcaseMedia,
} from '@/components/landing/media';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

const FRAME =
    'ld-drift overflow-hidden rounded-xl border border-hud-line bg-hud-page shadow-[0_30px_70px_-20px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.15)] transition duration-500 hover:shadow-[0_30px_70px_-20px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.4),0_0_60px_-20px_rgba(230,194,90,.35)]';

export function MediaFrame({
    title,
    children,
    className,
}: {
    title: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn(FRAME, className)}>
            <div className="flex items-center gap-2 border-b border-hud-rule bg-hud-surface px-3 py-1.5">
                <span className="flex gap-1" aria-hidden>
                    <span className="size-2 rounded-full bg-[#5a3a2a]" />
                    <span className="size-2 rounded-full bg-[#5a4a2a]" />
                    <span className="size-2 rounded-full bg-[#3a4a2a]" />
                </span>
                <span className="hud-sc truncate text-xs text-hud-bone">
                    {title}
                </span>
            </div>
            {children}
        </div>
    );
}

export const MEDIA_SIZES = {
    wide: '(min-width: 2560px) 1800px, (min-width: 1440px) 1200px, (min-width: 768px) 90vw, 100vw',
    phone: '(min-width: 768px) 360px, 80vw',
};

interface ScreenProps {
    id: ShowcaseId;
    locale: Locale;
    alt: string;
    priority?: boolean;
    sizes?: string;
    className?: string;
}

export function Screen({
    id,
    locale,
    alt,
    priority,
    sizes,
    className,
}: ScreenProps) {
    const media: ShowcaseMedia = showcaseMedia(locale)[id];

    const ratio = media.ratio === '9/16' ? 'aspect-[9/16]' : 'aspect-[16/10]';

    return (
        <div className={cn('relative', ratio, className)}>
            <Image
                src={media.image}
                alt={alt}
                fill
                sizes={
                    sizes ??
                    MEDIA_SIZES[media.ratio === '9/16' ? 'phone' : 'wide']
                }
                priority={priority}
                className="object-cover object-top"
            />
        </div>
    );
}
