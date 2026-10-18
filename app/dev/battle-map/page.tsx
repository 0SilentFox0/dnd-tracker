import { notFound } from "next/navigation";

import { BattleMapPlayground } from "@/components/battle/map/dev/BattleMapPlayground";

export default function BattleMapPlaygroundPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <BattleMapPlayground />;
}
