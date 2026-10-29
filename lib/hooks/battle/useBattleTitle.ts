import { useEffect } from "react";
import { useTranslations } from "next-intl";

export function useBattleTitle(name: string | undefined, myTurn: boolean) {
  const t = useTranslations("battle.notify");

  const yourTurnTitle = t("yourTurnTitle");

  useEffect(() => {
    if (myTurn) document.title = yourTurnTitle;
    else if (name) document.title = name;
  }, [myTurn, name, yourTurnTitle]);
}
