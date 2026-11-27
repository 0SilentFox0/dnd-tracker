import { LoadingState } from '@/components/common/states';
import { HudPage } from '@/components/hud/page';

export default function Loading() {
    return (
        <HudPage>
            <LoadingState variant="cards" count={6} />
        </HudPage>
    );
}
