import { ProfileShell } from '@/components/profile/ProfileShell';
import { LocaleScope } from '@/lib/i18n/locale-scope';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <LocaleScope
            namespaces={['common', 'validation', 'auth', 'onboarding']}
        >
            <ProfileShell>{children}</ProfileShell>
        </LocaleScope>
    );
}
