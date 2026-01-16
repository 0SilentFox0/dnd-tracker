"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UnitImportDialog } from "@/components/units/UnitImportDialog";
import { CreateGroupDialog } from "@/components/units/CreateGroupDialog";
import { useCreateUnitGroup } from "@/lib/hooks/useUnits";

interface UnitsPageHeaderProps {
  campaignId: string;
  unitsCount: number;
  onDeleteAll: () => void;
}

export function UnitsPageHeader({
  campaignId,
  unitsCount,
  onDeleteAll,
}: UnitsPageHeaderProps) {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDamageModifier, setGroupDamageModifier] = useState<string | null>(
    null
  );
  const createGroupMutation = useCreateUnitGroup(campaignId);

  const handleCreateGroup = () => {
    if (!groupName.trim()) return;
    createGroupMutation.mutate(
      {
        name: groupName.trim(),
        damageModifier: groupDamageModifier,
      },
      {
        onSuccess: () => {
          setCreateGroupOpen(false);
          setGroupName("");
          setGroupDamageModifier(null);
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex flex-col min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold truncate">NPC Юніти</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Управління мобами та юнітами
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 shrink-0">
        <UnitImportDialog campaignId={campaignId} />
        <Button
          variant="outline"
          className="whitespace-nowrap text-xs sm:text-sm w-full"
          onClick={() => setCreateGroupOpen(true)}
        >
          + Група
        </Button>
        <Link href={`/campaigns/${campaignId}/dm/units/new`}>
          <Button className="whitespace-nowrap text-xs sm:text-sm w-full">
            + Створити юніта
          </Button>
        </Link>
        {unitsCount > 0 && (
          <Button
            variant="destructive"
            className="whitespace-nowrap text-xs sm:text-sm w-full justify-center"
            onClick={onDeleteAll}
          >
            Видалити всі юніти
          </Button>
        )}
      </div>

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        name={groupName}
        onNameChange={setGroupName}
        damageModifier={groupDamageModifier}
        onDamageModifierChange={setGroupDamageModifier}
        onConfirm={handleCreateGroup}
        isCreating={createGroupMutation.isPending}
      />
    </div>
  );
}
