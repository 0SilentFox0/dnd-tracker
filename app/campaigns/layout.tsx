import { LocaleScope } from "@/lib/i18n/locale-scope";
import { CAMPAIGN_NAMESPACES } from "@/lib/i18n/scopes";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LocaleScope namespaces={CAMPAIGN_NAMESPACES}>{children}</LocaleScope>;
}
