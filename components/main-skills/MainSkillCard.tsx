"use client";

import Image from "next/image";
import Link from "next/link";
import { Edit,MoreVertical, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MainSkill } from "@/types/main-skills";

interface MainSkillCardProps {
  mainSkill: MainSkill;
  campaignId: string;
  onDelete: (mainSkillId: string) => void;
}

export function MainSkillCard({
  mainSkill,
  campaignId,
  onDelete,
}: MainSkillCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: mainSkill.color }}
              />
              {mainSkill.name}
            </CardTitle>
            <CardDescription className="mt-2">
              ID: {mainSkill.id}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/campaigns/${campaignId}/dm/main-skills/${mainSkill.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Редагувати
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(mainSkill.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Видалити
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <span className="text-sm font-semibold">Колір сегменту:</span>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-8 h-8 rounded border-2 border-gray-300"
                style={{ backgroundColor: mainSkill.color }}
              />
              <Badge variant="outline">{mainSkill.color}</Badge>
            </div>
          </div>
          {mainSkill.icon && (
            <div>
              <span className="text-sm font-semibold">Іконка:</span>
              <div className="mt-1 flex items-center justify-center w-8 h-8 rounded bg-muted">
                {mainSkill.icon.startsWith("http://") ||
                mainSkill.icon.startsWith("https://") ||
                mainSkill.icon.startsWith("/") ? (
                  <Image
                    src={mainSkill.icon}
                    alt={mainSkill.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-xl" title={mainSkill.name}>
                    {mainSkill.icon}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
