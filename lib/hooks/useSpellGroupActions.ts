import { useState, useCallback } from "react";
import {
  useRenameSpellGroup,
  useRemoveAllSpellsFromGroup,
} from "@/lib/hooks/useSpells";

interface UseSpellGroupActionsProps {
  campaignId: string;
  groupName: string;
  groupId?: string;
}

/**
 * Хук для управління діями з групами заклинань
 */
export function useSpellGroupActions({
  campaignId,
  groupName,
  groupId,
}: UseSpellGroupActionsProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [removeAllDialogOpen, setRemoveAllDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName);

  const renameGroupMutation = useRenameSpellGroup(campaignId);
  const removeAllSpellsMutation = useRemoveAllSpellsFromGroup(campaignId);

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

  const handleRemoveAllSpells = useCallback(() => {
    if (!groupId) return;
    removeAllSpellsMutation.mutate(groupId, {
      onSuccess: () => {
        setRemoveAllDialogOpen(false);
      },
    });
  }, [groupId, removeAllSpellsMutation]);

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
    handleRemoveAllSpells,
    openRenameDialog,
    closeRenameDialog,
    isRenaming: renameGroupMutation.isPending,
    isRemoving: removeAllSpellsMutation.isPending,
  };
}
