import { useState, useCallback } from "react";
import {
  useRenameUnitGroup,
  useRemoveAllUnitsFromGroup,
} from "@/lib/hooks/useUnits";

interface UseUnitGroupActionsProps {
  campaignId: string;
  groupName: string;
  groupId?: string;
}

/**
 * Хук для управління діями з групами юнітів
 */
export function useUnitGroupActions({
  campaignId,
  groupName,
  groupId,
}: UseUnitGroupActionsProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [removeAllDialogOpen, setRemoveAllDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName);

  const renameGroupMutation = useRenameUnitGroup(campaignId);
  const removeAllUnitsMutation = useRemoveAllUnitsFromGroup(campaignId);

  const handleRenameGroup = useCallback(() => {
    if (!groupId || !newGroupName.trim()) return;
    renameGroupMutation.mutate(
      {
        groupId,
        name: newGroupName,
      },
      {
        onSuccess: () => {
          setRenameDialogOpen(false);
          setNewGroupName(groupName);
        },
      }
    );
  }, [groupId, newGroupName, groupName, renameGroupMutation]);

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
    setRenameDialogOpen(true);
  }, [groupName]);

  const closeRenameDialog = useCallback(() => {
    setRenameDialogOpen(false);
    setNewGroupName(groupName);
  }, [groupName]);

  return {
    renameDialogOpen,
    removeAllDialogOpen,
    newGroupName,
    setNewGroupName,
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
