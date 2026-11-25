import { AccountShell } from '@/components/layout/AccountShell';
import { LocaleScope } from '@/lib/i18n/locale-scope';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <LocaleScope
            namespaces={['common', 'gameTerms', 'validation', 'onboarding', 'soundboard', 'whatsNew']}
        >
            <AccountShell>{children}</AccountShell>
        </LocaleScope>
    );
}
