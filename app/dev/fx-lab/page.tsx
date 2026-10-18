import { notFound } from "next/navigation";

import { FxLab } from "@/components/battle/fx-lab/FxLab";

export const metadata = { title: "Лабораторія анімацій" };

export default function FxLabPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return <FxLab />;
}
