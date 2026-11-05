import { ExtendLocaleScope } from "@/lib/i18n/extend-locale-scope";
import { BATTLE_NAMESPACES, WFRP_BATTLE_NAMESPACES } from "@/lib/i18n/scopes";
import { isWfrpCampaign } from "@/lib/server/campaigns/system-key";

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;

  const namespaces = (await isWfrpCampaign(id)) ? WFRP_BATTLE_NAMESPACES : BATTLE_NAMESPACES;

  return <ExtendLocaleScope namespaces={namespaces}>{children}</ExtendLocaleScope>;
}
