"use client";

import Link from "next/link";

import { DmCharacterEditFormAccordion } from "./DmCharacterEditFormAccordion";

import { ActionBar } from "@/components/common/ActionBar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DmCharacterEditor } from "@/lib/hooks/characters";

export function DmCharacterEditForm({ editor }: { editor: DmCharacterEditor }) {
  const { form, campaignId, membersLoading, levelUp } = editor;

  const { basicInfo, error, handleSubmit, loading } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Редагувати персонажа: {basicInfo.name || "Завантаження..."}
        </CardTitle>
        <CardDescription>Оновіть інформацію про персонажа</CardDescription>
      </CardHeader>
      <CardContent className="w-full overflow-hidden">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Помилка:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 w-full flex flex-col"
        >
          <DmCharacterEditFormAccordion editor={editor} />

          <ActionBar>
            <Button
              type="button"
              variant="default"
              onClick={(e) => {
                e.preventDefault();
                void levelUp();
              }}
            >
              Підняти рівень ({basicInfo.level} → {basicInfo.level + 1})
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${campaignId}/dm/characters`}>Скасувати</Link>
            </Button>
            <Button type="submit" disabled={loading || membersLoading}>
              {loading ? "Збереження..." : "Зберегти зміни"}
            </Button>
          </ActionBar>
        </form>
      </CardContent>
    </Card>
  );
}
