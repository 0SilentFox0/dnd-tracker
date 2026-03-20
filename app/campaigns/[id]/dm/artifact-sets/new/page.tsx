import Link from "next/link";
import { redirect } from "next/navigation";

import { ArtifactSetForm } from "@/components/artifact-sets/ArtifactSetForm";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function NewArtifactSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthUser();

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId: user.id },
      },
    },
  });

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${id}`);
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/campaigns/${id}/dm/artifact-sets`}>← Назад</Link>
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold">Новий сет артефактів</h1>
        <p className="text-muted-foreground mt-1">
          Задайте бонус повного комплекту та оберіть артефакти-члени сету.
        </p>
      </div>
      <ArtifactSetForm campaignId={id} initialSetBonus={{}} />
    </div>
  );
}
