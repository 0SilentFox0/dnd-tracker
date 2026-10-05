import { BattlePageClient } from "./BattlePageClient";

import { createClient } from "@/lib/supabase/server";

export default async function BattlePage({ params }: { params: Promise<{ id: string; battleId: string }> }) {
  const { id, battleId } = await params;

  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  return <BattlePageClient campaignId={id} battleId={battleId} userId={data?.claims?.sub ?? null} />;
}
