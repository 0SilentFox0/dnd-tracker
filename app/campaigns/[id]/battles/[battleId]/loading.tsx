import { getTranslations } from "next-intl/server";

import "@/components/hud/hud.css";
import "@/components/battle/hud/battle-hud.css";
import { LoadingState } from "@/components/common/states";

export default async function BattleLoading() {
  const t = await getTranslations("common");

  return (
    <div className="battle-hud flex min-h-[70dvh] items-center justify-center px-4">
      <LoadingState label={t("loading.battle")} className="w-full max-w-md" />
    </div>
  );
}
