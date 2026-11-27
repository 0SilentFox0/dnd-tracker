import { getTranslations } from 'next-intl/server';

import { LoadingState } from '@/components/common/states';
import { HudPage } from '@/components/hud/page';

export default async function CharacterLoading() {
    const t = await getTranslations('common');

    return (
        <HudPage>
            <LoadingState variant="detail" label={t('loading.character')} />
        </HudPage>
    );
}
