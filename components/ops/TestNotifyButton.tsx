'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useTestNotify } from '@/lib/hooks/ops';

export function TestNotifyButton() {
    const t = useTranslations('ops.notify');

    const { mutate, isPending, isError, data } = useTestNotify();

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
                variant="outline"
                disabled={isPending}
                onClick={() => mutate()}
            >
                {isPending ? t('sending') : t('button')}
            </Button>
            <p
                role="status"
                className="text-sm text-muted-foreground"
                data-testid="notify-result"
            >
                {isError
                    ? t('error')
                    : data
                      ? t('result', {
                            telegram: t(`channel.${data.telegram}`),
                            email: t(`channel.${data.email}`),
                        })
                      : null}
            </p>
        </div>
    );
}
