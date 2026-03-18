"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditBattleBasicInfoCardProps {
  formData: { name: string; description: string };
  onChange: (data: { name?: string; description?: string }) => void;
}

export function EditBattleBasicInfoCard({
  formData,
  onChange,
}: EditBattleBasicInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Основна інформація</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Назва битви *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
            placeholder="Назва битви"
          />
        </div>
        <div>
          <Label htmlFor="description">Опис</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Опис битви (опціонально)"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
