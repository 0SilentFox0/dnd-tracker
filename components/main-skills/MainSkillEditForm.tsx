"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormCard } from "@/components/common/FormCard";
import { FormField } from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotify } from "@/lib/hooks/common";
import { useUpdateMainSkill } from "@/lib/hooks/skills";
import { useSpellGroups } from "@/lib/hooks/spells";
import type { MainSkill } from "@/types/main-skills";
import type { MainSkillFormData } from "@/types/main-skills";

interface MainSkillEditFormProps {
  campaignId: string;
  mainSkill: MainSkill;
}

export function MainSkillEditForm({
  campaignId,
  mainSkill,
}: MainSkillEditFormProps) {
  const notify = useNotify();

  const router = useRouter();

  const updateMainSkillMutation = useUpdateMainSkill(campaignId);

  const { data: spellGroups = [] } = useSpellGroups(campaignId);

  const [formData, setFormData] = useState<MainSkillFormData>({
    name: mainSkill.name,
    color: mainSkill.color,
    icon: mainSkill.icon || "",
    isEnableInSkillTree: mainSkill.isEnableInSkillTree ?? false,
    spellGroupId: mainSkill.spellGroupId ?? null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMainSkillMutation.mutateAsync({
        mainSkillId: mainSkill.id,
        data: formData,
      });
      router.push(`/campaigns/${campaignId}/dm/main-skills`);
      router.refresh();
    } catch (error) {
      console.error("Error updating main skill:", error);
      void notify("Помилка при оновленні основного навику");
    }
  };

  return (
    <FormCard
      title="Редагувати основний навик"
      description="Оновіть інформацію про основний навик"
      onSubmit={handleSubmit}
      isSubmitting={updateMainSkillMutation.isPending}
      onCancel={() => router.push(`/campaigns/${campaignId}/dm/main-skills`)}
    >
      <FormField label="Назва" htmlFor="name" required>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </FormField>

      <FormField
        label="Колір сегменту"
        htmlFor="color"
        required
        description="Колір використовується для відображення сегменту в дереві прокачки"
      >
        <div className="flex items-center gap-2">
          <Input
            id="color"
            type="color"
            value={formData.color}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, color: e.target.value }))
            }
            className="w-20 h-10"
          />
          <Input
            type="text"
            value={formData.color}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, color: e.target.value }))
            }
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      </FormField>

      <FormField label="Іконка (URL)" htmlFor="icon">
        <Input
          id="icon"
          type="url"
          value={formData.icon || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, icon: e.target.value }))
          }
          placeholder="https://example.com/icon.png"
        />
      </FormField>

      {spellGroups.length > 0 && (
        <FormField
          label="Група заклинань (школа магії)"
          htmlFor="spellGroupId"
          description="При вивченні рівня цієї навички герой отримає заклинання обраної групи"
        >
          <Select
            value={formData.spellGroupId || "__none__"}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                spellGroupId: value === "__none__" ? null : value,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Оберіть групу заклинань" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Без групи —</SelectItem>
              {spellGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

    </FormCard>
  );
}
