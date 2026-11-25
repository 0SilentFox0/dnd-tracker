import { LocaleScope } from '@/lib/i18n/locale-scope';
import { CAMPAIGN_BASE } from '@/lib/i18n/route-scopes';

export default function Layout({ children }: { children: React.ReactNode }) {
    return <LocaleScope namespaces={CAMPAIGN_BASE}>{children}</LocaleScope>;
}
