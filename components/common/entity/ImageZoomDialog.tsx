'use client';

import Image from 'next/image';

import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { toMediaUrl } from '@/lib/utils/common/image-url';

interface ImageZoomDialogProps {
    src: string;
    name: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shape?: 'square' | 'portrait';
}

export function ImageZoomDialog({
    src,
    name,
    open,
    onOpenChange,
    shape = 'portrait',
}: ImageZoomDialogProps) {
    const square = shape === 'square';

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={name}
            size={square ? 'lg' : undefined}
            hud
        >
            {square ? (
                <div className="relative mx-auto aspect-square w-full max-w-[min(80vh,640px)]">
                    <Image
                        src={toMediaUrl(src)}
                        alt={name}
                        fill
                        sizes="640px"
                        className="object-contain"
                    />
                </div>
            ) : (
                <OptimizedImage
                    src={toMediaUrl(src)}
                    alt={name}
                    width={1200}
                    height={1600}
                    className="mx-auto max-h-[75vh] w-auto max-w-full object-contain"
                />
            )}
        </ResponsiveDialog>
    );
}
