import { AccountShell } from '@/components/layout/AccountShell';
import { getAccountSeed } from '@/lib/auth';
import { AccountSeedProvider } from '@/lib/hooks/auth';
import { LocaleScope } from '@/lib/i18n/locale-scope';
import { hasDmRole } from '@/lib/server/campaigns/has-dm-role';

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const seed = await getAccountSeed();

    const dmTools = seed ? await hasDmRole(seed.user.id) : false;

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
                <AccountShell dmTools={dmTools}>{children}</AccountShell>
            </AccountSeedProvider>
        </LocaleScope>
    );
}
