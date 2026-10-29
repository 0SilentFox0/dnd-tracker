import { notFound } from "next/navigation";

import { FxLab } from "@/components/battle/dev/FxLab";

export const metadata = { title: "Animation lab" };

export default function FxLabPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <FxLab />;
}
