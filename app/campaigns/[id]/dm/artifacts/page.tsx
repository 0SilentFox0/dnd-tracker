import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { OptimizedImage } from "@/components/common/OptimizedImage";

export default async function DMArtifactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthUser();
  const userId = user.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${id}`);
  }

  const artifacts = await prisma.artifact.findMany({
    where: {
      campaignId: id,
    },
    include: {
      artifactSet: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const artifactSets = await prisma.artifactSet.findMany({
    where: {
      campaignId: id,
    },
    include: {
      artifacts: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Артефакти</h1>
          <p className="text-muted-foreground mt-1">
            Управління артефактами та сетами
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href={`/campaigns/${id}/dm/artifacts/sets/new`}>
            <Button variant="outline" className="whitespace-nowrap">
              + Сет
            </Button>
          </Link>
          <Link href={`/campaigns/${id}/dm/artifacts/new`}>
            <Button className="whitespace-nowrap">+ Створити артефакт</Button>
          </Link>
        </div>
      </div>

      {/* Сети артефактів */}
      {artifactSets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Сети артефактів</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {artifactSets.map((set) => (
              <Card key={set.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{set.name}</CardTitle>
                  <CardDescription>
                    {set.artifacts.length} артефактів в сеті
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/campaigns/${id}/dm/artifacts/sets/${set.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      Редагувати сет
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Артефакти */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Артефакти</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {artifacts.map((artifact) => (
            <Card
              key={artifact.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 relative">
                    {artifact.icon ? (
                      <OptimizedImage
                        src={artifact.icon}
                        alt={artifact.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        fallback={
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <span className="text-xl text-muted-foreground">
                              {artifact.name[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-xl text-muted-foreground">
                          {artifact.name[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base flex-1 min-w-0 truncate">
                        {artifact.name}
                      </CardTitle>
                      {artifact.rarity && (
                        <Badge variant="outline" className="shrink-0">
                          {artifact.rarity}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription className="flex gap-2 mt-2">
                  <Badge variant="secondary">{artifact.slot}</Badge>
                  {artifact.artifactSet && (
                    <Badge variant="outline">
                      Сет: {artifact.artifactSet.name}
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {artifact.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {artifact.description}
                  </p>
                )}
                <Link href={`/campaigns/${id}/dm/artifacts/${artifact.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Редагувати
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {artifacts.length === 0 && artifactSets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Поки немає артефактів</p>
            <Link href={`/campaigns/${id}/dm/artifacts/new`}>
              <Button>Створити перший артефакт</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Link href={`/campaigns/${id}`}>
          <Button variant="outline">← Назад до кампанії</Button>
        </Link>
      </div>
    </div>
  );
}
