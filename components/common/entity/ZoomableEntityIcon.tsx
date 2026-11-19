'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import {
    EntityIcon,
    type EntityIconProps,
    isImageSrc,
} from '@/components/common/entity/EntityIcon';
import { ImageZoomDialog } from '@/components/common/entity/ImageZoomDialog';
import { HudButton } from '@/components/hud';

export function ZoomableEntityIcon(props: EntityIconProps) {
    const t = useTranslations('common.actions');

    const [open, setOpen] = useState(false);

    const src = props.src?.trim();

    if (!src || !isImageSrc(src)) return <EntityIcon {...props} />;

    return (
        <>
            <HudButton
                type="button"
                aria-label={t('zoomIcon', { name: props.name })}
                className="shrink-0 cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-hud-gold"
                onClick={() => setOpen(true)}
            >
                <EntityIcon {...props} />
            </HudButton>
            <ImageZoomDialog
                src={src}
                name={props.name}
                open={open}
                onOpenChange={setOpen}
                shape="square"
            />
        </>
    );
}
