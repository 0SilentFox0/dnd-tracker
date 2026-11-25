import { AccountShell } from '@/components/layout/AccountShell';
import { getAccountSeed } from '@/lib/auth';
import { AccountSeedProvider } from '@/lib/hooks/auth';
import { LocaleScope } from '@/lib/i18n/locale-scope';

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const seed = await getAccountSeed();

    return (
        <LocaleScope
            namespaces={[
                'common',
                'gameTerms',
                'validation',
                'auth',
                'onboarding',
                'whatsNew',
            ]}
        >
            <AccountSeedProvider value={seed}>
                <AccountShell>{children}</AccountShell>
            </AccountSeedProvider>
        </LocaleScope>
    );
}
