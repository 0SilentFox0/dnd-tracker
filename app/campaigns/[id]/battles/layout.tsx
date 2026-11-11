import { ExtendLocaleScope } from "@/lib/i18n/extend-locale-scope";
import { BATTLE_NAMESPACES } from "@/lib/i18n/scopes";
import { systemScope } from "@/lib/i18n/system-scope";
import { systemKeyOfCampaign } from "@/lib/server/campaigns/system-key";

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;

  const namespaces = [...BATTLE_NAMESPACES, ...systemScope(await systemKeyOfCampaign(id), "battle")];

  return <ExtendLocaleScope namespaces={namespaces}>{children}</ExtendLocaleScope>;
}
