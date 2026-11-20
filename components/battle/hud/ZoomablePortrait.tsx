'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Portrait, type PortraitProps } from './Portrait';

import { ImageZoomDialog } from '@/components/common/entity/ImageZoomDialog';
import { HudButton } from '@/components/hud';
import { toMediaUrl } from '@/lib/utils/common/image-url';

interface ZoomablePortraitProps
    extends Omit<PortraitProps, 'current' | 'extra'> {
    /** restarts only the portrait animation, the zoom dialog stays open */
    flashKey?: string;
}

export function ZoomablePortrait({
    flashKey,
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
                aria-label={t('zoomAvatar', { name })}
                onClick={() => setZoomed(true)}
                className="cursor-zoom-in rounded-full"
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
