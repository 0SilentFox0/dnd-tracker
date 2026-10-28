import { getTranslations } from "next-intl/server";

import { LoadingState } from "@/components/common/states";

export default async function CharacterLoading() {
  const t = await getTranslations("common");

  return (
    <div className="container mx-auto p-4">
      <LoadingState rows={4} label={t("loading.character")} />
    </div>
  );
}
