import { useState, useCallback } from "react";
import {
  useRenameUnitGroup,
  useRemoveAllUnitsFromGroup,
} from "@/lib/hooks/useUnits";

interface UseUnitGroupActionsProps {
  campaignId: string;
  groupName: string;
  groupId?: string;
  groupDamageModifier?: string | null;
}

/**
 * Хук для управління діями з групами юнітів
 */
export function useUnitGroupActions({
  campaignId,
  groupName,
  groupId,
  groupDamageModifier,
}: UseUnitGroupActionsProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [removeAllDialogOpen, setRemoveAllDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName);
  const [newGroupDamageModifier, setNewGroupDamageModifier] = useState<
    string | null
  >(groupDamageModifier ?? null);

  const renameGroupMutation = useRenameUnitGroup(campaignId);
  const removeAllUnitsMutation = useRemoveAllUnitsFromGroup(campaignId);

  const handleRenameGroup = useCallback(() => {
    if (!groupId || !newGroupName.trim()) return;
    renameGroupMutation.mutate(
      {
        groupId,
        name: newGroupName,
        damageModifier: newGroupDamageModifier,
      },
      {
        onSuccess: () => {
          setRenameDialogOpen(false);
          setNewGroupName(groupName);
          setNewGroupDamageModifier(groupDamageModifier ?? null);
        },
      }
    );
  }, [
    groupId,
    newGroupName,
    groupName,
    renameGroupMutation,
    newGroupDamageModifier,
    groupDamageModifier,
  ]);

  const handleRemoveAllUnits = useCallback(() => {
    if (!groupId) return;
    removeAllUnitsMutation.mutate(groupId, {
      onSuccess: () => {
        setRemoveAllDialogOpen(false);
      },
    });
  }, [groupId, removeAllUnitsMutation]);

  const openRenameDialog = useCallback(() => {
    setNewGroupName(groupName);
    setNewGroupDamageModifier(groupDamageModifier ?? null);
    setRenameDialogOpen(true);
  }, [groupName, groupDamageModifier]);

  const closeRenameDialog = useCallback(() => {
    setRenameDialogOpen(false);
    setNewGroupName(groupName);
    setNewGroupDamageModifier(groupDamageModifier ?? null);
  }, [groupName, groupDamageModifier]);

  return {
    renameDialogOpen,
    removeAllDialogOpen,
    newGroupName,
    setNewGroupName,
    newGroupDamageModifier,
    setNewGroupDamageModifier,
    setRenameDialogOpen,
    setRemoveAllDialogOpen,
    handleRenameGroup,
    handleRemoveAllUnits,
    openRenameDialog,
    closeRenameDialog,
    isRenaming: renameGroupMutation.isPending,
    isRemoving: removeAllUnitsMutation.isPending,
  };
}
