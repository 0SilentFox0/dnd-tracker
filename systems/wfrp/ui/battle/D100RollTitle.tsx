import { useTranslations } from 'next-intl';

export function D100RollTitle() {
    return <>{useTranslations('battleWfrp.ui')('rollTitle')}</>;
}
