import Link from "next/link";

import { ArtifactSetForm } from "@/components/artifact-sets/ArtifactSetForm";
import { Button } from "@/components/ui/button";
import { requireCampaignDM } from "@/lib/campaigns/access";

export default async function NewArtifactSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

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
