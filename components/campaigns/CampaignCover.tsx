import { OptimizedImage } from '@/components/common/entity/OptimizedImage';

const DEFAULT_CAMPAIGN_COVER = '/example-demo/maps/grove.jpg';

export function CampaignCover({
    src,
    width,
    height,
}: {
    src?: string | null;
    width: number;
    height: number;
}) {
    const image = (url: string, fallback?: React.ReactNode) => (
        <OptimizedImage
            src={url}
            alt=""
            width={width}
            height={height}
            className="size-full object-cover"
            fallback={fallback}
        />
    );

    return image(
        src || DEFAULT_CAMPAIGN_COVER,
        image(DEFAULT_CAMPAIGN_COVER)
    );
}
