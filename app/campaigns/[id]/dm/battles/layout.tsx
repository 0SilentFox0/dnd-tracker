import { ExtendLocaleScope } from "@/lib/i18n/extend-locale-scope";
import { BATTLE_NAMESPACES } from "@/lib/i18n/scopes";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ExtendLocaleScope namespaces={BATTLE_NAMESPACES}>{children}</ExtendLocaleScope>;
}
