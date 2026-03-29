import { useMemo, useState, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { type StudentSemester } from "@/types/type-user";
import {
  apiCreateWorksheet,
  apiUpdateWorksheet,
  apiDeleteWorksheet,
} from "@/api/worksheets";

type UseWorksheetManagerReturn = {
  worksheets: any[];
  activeWorksheetId: string | null;
  activeWorksheet: any | undefined;
  activeSemesters: StudentSemester[];

  // helpers / actions
  isMainId: (id: string | null | undefined) => boolean;
  setActiveWorksheet: (id: string | null) => void;

  // inline UI state (rename/delete/create in dropdown)
  isRenaming: boolean;
  renameTargetId: string | null;
  renameValue: string;
  renameError: string;
  beginRename: (id: string, currentName: string) => void;
  cancelRename: () => void;
  setRenameValue: (v: string) => void;
  commitRename: () => void;

  isDeleting: boolean;
  deleteTargetId: string | null;
  beginDelete: (id: string) => void;
  cancelDelete: () => void;
  confirmDelete: () => void;

  isCreating: boolean;
  newWorksheetName: string;
  newWorksheetError: string;
  beginCreate: () => void;
  cancelCreate: () => void;
  setNewWorksheetName: (v: string) => void;
  commitCreate: () => void;

  resetWorksheetInlineState: () => void;
  createWorksheet: (name?: string) => Promise<{ id: string; name: string; studentSemesters: never[] } | undefined>;
};

export function useWorksheetManager(): UseWorksheetManagerReturn {
  const { userData, setUserData } = useUser();

  const worksheets = userData?.FYP?.worksheets ?? [];
  const activeWorksheetId = userData?.FYP?.activeWorksheetID ?? null;
  const activeWorksheet = worksheets.find((w) => w.id === activeWorksheetId);
  const mainId = userData?.FYP.worksheets.find((w) => w.name === "Main Worksheet")?.id || "";

  const activeSemesters: StudentSemester[] = useMemo(() => {
    if (!userData) return [];
    const ws = worksheets.find((w) => w.id === activeWorksheetId);
    return ws?.studentSemesters ?? [];
  }, [userData, activeWorksheetId, worksheets]);

  const isMainId = useCallback(
    (id: string | null | undefined) => {
      const ws = worksheets.find((w) => w.id === id);
      if (!ws) return false;
      return ws.name === "Main Worksheet" || ws.id === mainId;
    },
    [worksheets, mainId]
  );

  // ---------- Inline worksheet actions state ----------
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, _setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newWorksheetName, _setNewWorksheetName] = useState("");
  const [newWorksheetError, setNewWorksheetError] = useState("");

  const resetWorksheetInlineState = useCallback(() => {
    setIsRenaming(false);
    setIsDeleting(false);
    setIsCreating(false);
    setRenameTargetId(null);
    setDeleteTargetId(null);
    _setRenameValue("");
    setRenameError("");
    _setNewWorksheetName("");
    setNewWorksheetError("");
  }, []);

  const setActiveWorksheet = useCallback(
    (id: string | null) => {
      if (!userData) return;

      setUserData({
        ...userData,
        FYP: {
          ...userData.FYP,
          activeWorksheetID: id ?? mainId,
        },
      });

      resetWorksheetInlineState();
    },
    [userData, setUserData, resetWorksheetInlineState, mainId]
  );

  const createWorksheet = useCallback(
    async (name?: string) => {
      if (!userData) return;

      const defaultName = `Worksheet ${worksheets.length}`;
      const finalName = (name ?? defaultName).trim() || defaultName;

      // Create on the backend first to get the real ID
      const newWs = await apiCreateWorksheet({ name: finalName });

      const pastDegreeProgress = userData.FYP.degreeProgress2 ?? [];
      const mainWsMajors =
        pastDegreeProgress.find((dp) => dp.worksheetID === mainId)?.majors ?? [];

      const frontendWs = {
        id: String(newWs.id),
        name: newWs.name,
        studentSemesters: [],
      };

      setUserData({
        ...userData,
        FYP: {
          ...userData.FYP,
          worksheets: [...worksheets, frontendWs],
          activeWorksheetID: frontendWs.id,
          degreeProgress2: [
            ...pastDegreeProgress,
            { worksheetID: frontendWs.id, majors: [...mainWsMajors] },
          ],
        },
      });

      return frontendWs;
    },
    [userData, setUserData, worksheets, mainId]
  );

  const renameWorksheet = useCallback(
    async (id: string, newName: string) => {
      if (!userData) return false;
      const trimmed = newName.trim();

      if (!trimmed) {
        setRenameError("Name cannot be empty.");
        return false;
      }

      const duplicate = worksheets.some(
        (w) => w.id !== id && w.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicate) {
        setRenameError("A worksheet with this name already exists.");
        return false;
      }

      // Update on the backend
      await apiUpdateWorksheet(parseInt(id), { name: trimmed });

      setUserData({
        ...userData,
        FYP: {
          ...userData.FYP,
          worksheets: worksheets.map((w) =>
            w.id === id ? { ...w, name: trimmed } : w
          ),
        },
      });

      setRenameError("");
      return true;
    },
    [userData, setUserData, worksheets]
  );

  const deleteWorksheet = useCallback(
    async (id: string) => {
      if (!userData || isMainId(id)) return;

      // Delete on the backend
      await apiDeleteWorksheet(parseInt(id));

      const nextList = worksheets.filter((w) => w.id !== id);
      const newDegreeProgress = (userData.FYP.degreeProgress2 ?? []).filter(
        (dp) => dp.worksheetID !== id
      );

      let nextActiveId = userData.FYP.activeWorksheetID;
      if (nextActiveId === id) nextActiveId = mainId;

      setUserData({
        ...userData,
        FYP: {
          ...userData.FYP,
          worksheets: nextList,
          activeWorksheetID: nextActiveId,
          degreeProgress2: newDegreeProgress,
        },
      });
    },
    [userData, setUserData, worksheets, isMainId, mainId]
  );

  // ---------- Inline UI actions ----------
  const setRenameValue = useCallback((v: string) => {
    _setRenameValue(v);
    setRenameError("");
  }, []);

  const beginRename = useCallback((id: string, currentName: string) => {
    setIsDeleting(false);
    setDeleteTargetId(null);
    setIsCreating(false);
    setNewWorksheetError("");

    setIsRenaming(true);
    setRenameTargetId(id);
    _setRenameValue(currentName);
    setRenameError("");
  }, []);

  const cancelRename = useCallback(() => {
    setIsRenaming(false);
    setRenameTargetId(null);
    _setRenameValue("");
    setRenameError("");
  }, []);

  const commitRename = useCallback(async () => {
    if (!renameTargetId) return;
    const ok = await renameWorksheet(renameTargetId, renameValue);
    if (ok) cancelRename();
  }, [renameTargetId, renameValue, renameWorksheet, cancelRename]);

  const beginDelete = useCallback((id: string) => {
    setIsRenaming(false);
    setRenameTargetId(null);
    setRenameError("");

    setIsCreating(false);
    setNewWorksheetError("");

    setIsDeleting(true);
    setDeleteTargetId(id);
  }, []);

  const cancelDelete = useCallback(() => {
    setIsDeleting(false);
    setDeleteTargetId(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    await deleteWorksheet(deleteTargetId);
    cancelDelete();
  }, [deleteTargetId, deleteWorksheet, cancelDelete]);

  const setNewWorksheetName = useCallback((v: string) => {
    _setNewWorksheetName(v);
    setNewWorksheetError("");
  }, []);

  const beginCreate = useCallback(() => {
    setIsRenaming(false);
    setIsDeleting(false);
    setRenameTargetId(null);
    setDeleteTargetId(null);
    setRenameError("");
    setNewWorksheetError("");

    setIsCreating(true);
    _setNewWorksheetName("New Worksheet");
  }, []);

  const cancelCreate = useCallback(() => {
    setIsCreating(false);
    _setNewWorksheetName("");
    setNewWorksheetError("");
  }, []);

  const commitCreate = useCallback(async () => {
    const trimmed = newWorksheetName.trim();
    if (!trimmed) {
      setNewWorksheetError("Name cannot be empty.");
      return;
    }
    const duplicate = worksheets.some(
      (w) => w.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setNewWorksheetError("A worksheet with this name already exists.");
      return;
    }
    await createWorksheet(trimmed);
    cancelCreate();
  }, [newWorksheetName, worksheets, createWorksheet, cancelCreate]);

  return {
    worksheets,
    activeWorksheetId,
    activeWorksheet,
    activeSemesters,

    isMainId,
    setActiveWorksheet,

    isRenaming,
    renameTargetId,
    renameValue,
    renameError,
    beginRename,
    cancelRename,
    setRenameValue,
    commitRename,

    isDeleting,
    deleteTargetId,
    beginDelete,
    cancelDelete,
    confirmDelete,

    isCreating,
    newWorksheetName,
    newWorksheetError,
    beginCreate,
    cancelCreate,
    setNewWorksheetName,
    commitCreate,

    resetWorksheetInlineState,
    createWorksheet,
  };
}