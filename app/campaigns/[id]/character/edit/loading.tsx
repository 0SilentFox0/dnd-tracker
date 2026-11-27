import { getTranslations } from 'next-intl/server';

import { LoadingState } from '@/components/common/states';
import { HudPage } from '@/components/hud/page';

export default async function CharacterEditLoading() {
    const t = await getTranslations('common');

    return (
        <HudPage>
            <LoadingState variant="form" label={t('loading.form')} />
        </HudPage>
    );
}
