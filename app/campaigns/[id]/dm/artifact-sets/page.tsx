import Link from "next/link";
import { redirect } from "next/navigation";

import { ArtifactSetCardIcon } from "@/components/artifact-sets/ArtifactSetCardIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DMArtifactSetsPage({
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

  const sets = await prisma.artifactSet.findMany({
    where: { campaignId: id },
    include: {
      artifacts: { select: { id: true, name: true, slot: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Сети артефактів</h1>
          <p className="text-muted-foreground mt-1">
            Групи артефактів з бонусом за повний комплект (у бою)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button asChild>
            <Link href={`/campaigns/${id}/dm/artifact-sets/new`}>
              + Новий сет
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/campaigns/${id}/dm/artifacts`}>До артефактів</Link>
          </Button>
        </div>
      </div>

      {sets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="mb-4">Ще немає сетів.</p>
            <Button asChild>
              <Link href={`/campaigns/${id}/dm/artifact-sets/new`}>
                Створити перший сет
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sets.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <ArtifactSetCardIcon url={s.icon} name={s.name} size="lg" />
                    <div className="min-w-0">
                      <CardTitle className="text-lg">{s.name}</CardTitle>
                      {s.description && (
                        <CardDescription className="mt-1">
                          {s.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/campaigns/${id}/dm/artifact-sets/${s.id}`}>
                      Редагувати
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Частин: {s.artifacts.length}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {s.artifacts.map((a) => (
                      <Badge key={a.id} variant="secondary" className="text-xs">
                        {a.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
