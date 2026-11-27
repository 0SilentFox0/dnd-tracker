'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Portrait, type PortraitProps } from './Portrait';

import { ImageZoomDialog } from '@/components/common/entity/ImageZoomDialog';
import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';
import { toMediaUrl } from '@/lib/utils/common/image-url';

interface ZoomablePortraitProps
    extends Omit<PortraitProps, 'current' | 'extra'> {
    /** restarts only the portrait animation, the zoom dialog stays open */
    flashKey?: string;
    /** opens the participant's stat card instead of the full-size image */
    onOpenDetails?: () => void;
}

export function ZoomablePortrait({
    flashKey,
    onOpenDetails,
    ...props
}: ZoomablePortraitProps) {
    const t = useTranslations('battle.hud');

    const { avatar, name } = props.participant.basicInfo;

    const [zoomed, setZoomed] = useState(false);

    if (!avatar) return <Portrait key={flashKey} {...props} />;

    return (
        <>
            <HudButton
                type="button"
                data-ux-tile
                aria-label={t(onOpenDetails ? 'openDetails' : 'zoomAvatar', {
                    name,
                })}
                onClick={onOpenDetails ?? (() => setZoomed(true))}
                className={cn(
                    'rounded-full',
                    onOpenDetails ? 'cursor-pointer' : 'cursor-zoom-in'
                )}
            >
                <Portrait key={flashKey} {...props} />
            </HudButton>
            {zoomed && (
                <ImageZoomDialog
                    src={toMediaUrl(avatar)}
                    name={name}
                    open
                    onOpenChange={setZoomed}
                    shape="square"
                />
            )}
        </>
    );
}
