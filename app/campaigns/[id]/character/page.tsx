import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { getAbilityModifier } from "@/lib/utils/calculations";

export default async function CharacterPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!campaign) {
    redirect("/campaigns");
  }

  const userMember = campaign.members[0];
  if (!userMember) {
    redirect("/campaigns");
  }

  // Знаходимо персонажа гравця
  const character = await prisma.character.findFirst({
    where: {
      campaignId: params.id,
      controlledBy: userId,
      type: "player",
    },
    include: {
      inventory: true,
    },
  });

  if (!character) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              У вас поки немає персонажа в цій кампанії
            </p>
            <Link href={`/campaigns/${params.id}`}>
              <Button variant="outline">Назад до кампанії</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const strMod = getAbilityModifier(character.strength);
  const dexMod = getAbilityModifier(character.dexterity);
  const conMod = getAbilityModifier(character.constitution);
  const intMod = getAbilityModifier(character.intelligence);
  const wisMod = getAbilityModifier(character.wisdom);
  const chaMod = getAbilityModifier(character.charisma);

  const savingThrows = character.savingThrows as Record<string, boolean>;
  const skills = character.skills as Record<string, boolean>;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={character.avatar || undefined} />
            <AvatarFallback>
              {character.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{character.name}</h1>
            <p className="text-muted-foreground">
              {character.race} {character.subrace || ""} • {character.class}
              {character.subclass && ` (${character.subclass})`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.allowPlayerEdit && (
            <Link href={`/campaigns/${params.id}/character/edit`}>
              <Button variant="outline">Редагувати</Button>
            </Link>
          )}
          <Link href={`/campaigns/${params.id}`}>
            <Button variant="outline">Назад</Button>
          </Link>
        </div>
      </div>

      {/* Основна інформація */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Рівень та Досвід</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Рівень:</span>
              <span className="font-semibold">{character.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Досвід (XP):</span>
              <span className="font-semibold">{character.experience}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proficiency Bonus:</span>
              <span className="font-semibold">+{character.proficiencyBonus}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Здоров'я</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">HP:</span>
              <span className="font-semibold">
                {character.currentHp}/{character.maxHp}
              </span>
            </div>
            {character.tempHp > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Temp HP:</span>
                <span className="font-semibold">{character.tempHp}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hit Dice:</span>
              <span className="font-semibold">{character.hitDice}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Бойові параметри</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">AC:</span>
              <span className="font-semibold">{character.armorClass}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initiative:</span>
              <span className="font-semibold">{character.initiative}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Швидкість:</span>
              <span className="font-semibold">{character.speed} фт</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ability Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Основні характеристики</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "Сила", score: character.strength, mod: strMod, abbr: "STR" },
              { name: "Спритність", score: character.dexterity, mod: dexMod, abbr: "DEX" },
              { name: "Статура", score: character.constitution, mod: conMod, abbr: "CON" },
              { name: "Інтелект", score: character.intelligence, mod: intMod, abbr: "INT" },
              { name: "Мудрість", score: character.wisdom, mod: wisMod, abbr: "WIS" },
              { name: "Харизма", score: character.charisma, mod: chaMod, abbr: "CHA" },
            ].map(({ name, score, mod, abbr }) => (
              <div key={abbr} className="text-center p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">{name}</div>
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-sm">
                  {mod >= 0 ? "+" : ""}{mod}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Пасивні значення */}
      <Card>
        <CardHeader>
          <CardTitle>Пасивні значення</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Пасивна Уважність</div>
              <div className="text-xl font-semibold">{character.passivePerception}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Пасивне Розслідування</div>
              <div className="text-xl font-semibold">{character.passiveInvestigation}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Пасивне Розуміння</div>
              <div className="text-xl font-semibold">{character.passiveInsight}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Інвентар */}
      {character.inventory && (
        <Card>
          <CardHeader>
            <CardTitle>Інвентар</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Золото:</span>
                <span className="font-semibold">{character.inventory.gold as number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Срібло:</span>
                <span className="font-semibold">{character.inventory.silver as number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Мідь:</span>
                <span className="font-semibold">{character.inventory.copper as number}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
