import { useTranslations } from 'next-intl';

export function PendingChoiceNote() {
    const t = useTranslations('battle.critChoice');

    return (
        <p className="mt-2 text-sm text-[var(--hud-muted)] italic">
            {t('waitingNote')}
        </p>
    );
}
