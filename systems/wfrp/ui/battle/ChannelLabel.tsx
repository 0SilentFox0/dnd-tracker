import { useTranslations } from 'next-intl';

export function ChannelLabel() {
    return <>{useTranslations('wfrpMagic.ui.channel')('tile')}</>;
}
