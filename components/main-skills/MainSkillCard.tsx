"use client";

import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Trash2, Edit } from "lucide-react";
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
              <div className="mt-1">
                <img
                  src={mainSkill.icon}
                  alt={mainSkill.name}
                  className="w-8 h-8 object-cover rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
