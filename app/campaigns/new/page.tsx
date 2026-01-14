"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxLevel: 20,
    xpMultiplier: 2.5,
    allowPlayerEdit: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create campaign");
      }

      const campaign = await response.json();
      router.push(`/campaigns/${campaign.id}`);
    } catch (error) {
      console.error("Error creating campaign:", error);
      alert("Помилка при створенні кампанії");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <Link href="/campaigns">
          <Button variant="ghost">← Назад</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Створити нову кампанію</CardTitle>
          <CardDescription>
            Створіть нову кампанію D&D та станьте Dungeon Master
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Назва кампанії *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Назва вашої кампанії"
              />
            </div>

            <div>
              <Label htmlFor="description">Опис</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Короткий опис кампанії (опціонально)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxLevel">Максимальний рівень</Label>
                <Input
                  id="maxLevel"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.maxLevel}
                  onChange={(e) => setFormData({ ...formData, maxLevel: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="xpMultiplier">Множник досвіду</Label>
                <Input
                  id="xpMultiplier"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  value={formData.xpMultiplier}
                  onChange={(e) => setFormData({ ...formData, xpMultiplier: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowPlayerEdit"
                checked={formData.allowPlayerEdit}
                onChange={(e) => setFormData({ ...formData, allowPlayerEdit: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="allowPlayerEdit">Дозволити гравцям редагувати своїх персонажів</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Створення..." : "Створити кампанію"}
              </Button>
              <Link href="/campaigns">
                <Button type="button" variant="outline">Скасувати</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
