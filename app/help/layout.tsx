import { AccountShell } from '@/components/layout/AccountShell';
import { getSessionUserId } from '@/lib/auth';
import { LocaleScope } from '@/lib/i18n/locale-scope';
import { hasDmRole } from '@/lib/server/campaigns/has-dm-role';

export default async function Layout({ children }: { children: React.ReactNode }) {
    const userId = await getSessionUserId();

    const dmTools = userId ? await hasDmRole(userId) : false;

    return (
        <LocaleScope
            namespaces={['common', 'gameTerms', 'validation', 'onboarding', 'whatsNew']}
        >
            <AccountShell dmTools={dmTools}>{children}</AccountShell>
        </LocaleScope>
    );
}
