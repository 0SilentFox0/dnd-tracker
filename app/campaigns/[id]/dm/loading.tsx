import { getTranslations } from 'next-intl/server';

import { SectionLoading } from '@/components/common/states/SectionLoading';

export default async function DmSectionLoading() {
    const t = await getTranslations('common');

    return <SectionLoading label={t('loading.generic')} />;
}
