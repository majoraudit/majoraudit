import { useMemo, useState, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { type StudentSemester } from "@/types/type-user";
import { type Worksheet } from "@/types/type-user";
import {
  createWorksheet as apiCreateWorksheet,
  renameWorksheet as apiRenameWorksheet,
  deleteWorksheet as apiDeleteWorksheet,
  addSemester as apiAddSemester,
  removeSemester as apiRemoveSemester,
} from "@/api/coursePlanning";

const API_SEASON_TO_NUM: Record<string, number> = { SP: 1, SU: 2, FA: 3 };
const API_SEASON_TO_LABEL: Record<string, string> = { SP: "Spring", SU: "Summer", FA: "Fall" };

function transformWorksheetFromApi(apiWs: any): Worksheet {
  return {
    id: String(apiWs.id),
    name: apiWs.name,
    studentSemesters: (apiWs.semesters ?? []).map((s: any) => ({
      id: String(s.id),
      // combine year + season into a single sortable number (e.g. 202503 for FA 2025)
      season: s.year * 100 + (API_SEASON_TO_NUM[s.season] ?? 0),
      title: `${s.year} ${API_SEASON_TO_LABEL[s.season] ?? s.season}`,
      studentCourses: (s.classes ?? []).map((c: any) => ({
        course: c.course,
        term: s.year,
        status: "DA_PROSPECT",
      })),
      isCompleted: false,
    })),
  };
}

function transformSemesterFromApi(apiSemester: any): StudentSemester {
  return {
    id: String(apiSemester.id),
    season: apiSemester.year * 100 + (API_SEASON_TO_NUM[apiSemester.season] ?? 0),
    title: `${apiSemester.year} ${API_SEASON_TO_LABEL[apiSemester.season] ?? apiSemester.season}`,
    studentCourses: [],
    isCompleted: false,
  };
}

type UseWorksheetManagerReturn = {
  worksheets: Worksheet[];
  activeWorksheetId: string | null;
  activeWorksheet: Worksheet | undefined;
  activeSemesters: StudentSemester[];

  // helpers / actions
  isMainId: (id: string | null | undefined) => boolean;
  setActiveWorksheet: (id: string | null) => void;
  createWorksheet: (name?: string) => void;
  renameWorksheet: (id: string, newName: string) => Promise<boolean>; // returns success
  deleteWorksheet: (id: string) => void;
  addSemester: (payload: { year: number; season: string }) => Promise<void>;
  removeSemester: (semesterId: string) => Promise<void>;  

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
};

export function useWorksheetManager(): UseWorksheetManagerReturn {
  const { userData, setUserData } = useUser();

  const worksheets: Worksheet[] = userData?.FYP?.worksheets ?? [];
  const activeWorksheetId = userData?.FYP?.activeWorksheetID ?? null;
  const activeWorksheet: Worksheet | undefined =
    worksheets.find((w) => w.id === activeWorksheetId);

  const activeSemesters: StudentSemester[] = useMemo(() => {
    if (!userData) return [];
    const ws = worksheets.find((w) => w.id === activeWorksheetId);
    return ws?.studentSemesters ?? [];
  }, [userData, activeWorksheetId, worksheets]);

  const isMainId = useCallback(
    (id: string | null | undefined) => {
      const ws = worksheets.find((w) => w.id === id);
      if (!ws) return false;
      return ws.name === "Main Worksheet";
    },
    [worksheets]
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
          activeWorksheetID: id ?? worksheets[0]?.id ?? "",
        },
      });

      resetWorksheetInlineState();
    },
    [userData, setUserData, resetWorksheetInlineState]
  );

  const addSemester = useCallback(
    async (payload: { year: number; season: string }) => {
      if (!userData || !activeWorksheetId) return;

      try {
        const apiSemester = await apiAddSemester(
          activeWorksheetId,
          payload
        );

        const newSemester = transformSemesterFromApi(apiSemester);

        setUserData({
          ...userData,
          FYP: {
            ...userData.FYP,
            worksheets: worksheets.map((w) =>
              w.id === activeWorksheetId
                ? {
                    ...w,
                    studentSemesters: [
                      ...(w.studentSemesters ?? []),
                      newSemester,
                    ],
                  }
                : w
            ),
          },
        });
      } catch (err) {
        console.error("Failed to add semester", err);
      }
    },
    [userData, worksheets, activeWorksheetId, setUserData]
  );

  const removeSemester = useCallback(
    async (semesterId: string) => {
      if (!userData || !activeWorksheetId) return;

      try {
        await apiRemoveSemester(activeWorksheetId, semesterId);

        setUserData({
          ...userData,
          FYP: {
            ...userData.FYP,
            worksheets: worksheets.map((w) =>
              w.id === activeWorksheetId
                ? {
                    ...w,
                    studentSemesters: (w.studentSemesters ?? []).filter(
                      (s) => s.id !== semesterId
                    ),
                  }
                : w
            ),
          },
        });
      } catch (err) {
        console.error("Failed to remove semester", err);
      }
    },
    [userData, worksheets, activeWorksheetId, setUserData]
  );

  const createWorksheet = useCallback(
    async (name?: string) => {
      if (!userData) return;

      const defaultName = `Worksheet ${worksheets.length + 1}`;
      const finalName = (name ?? defaultName).trim() || defaultName;

      try {
        const newWs = await apiCreateWorksheet(finalName);
        const transformed = transformWorksheetFromApi(newWs);

        setUserData({
          ...userData,
          FYP: {
            ...userData.FYP,
            worksheets: [...worksheets, transformed],
            activeWorksheetID: transformed.id,
          },
        });
      } catch (err) {
        console.error("Failed to create worksheet", err);
      }
    },
    [userData, setUserData, worksheets]
  );

  // returns success so callers can close UI reliably
  const renameWorksheet = useCallback(
    async (id: string, newName: string) => {
      if (!userData) return false;

      const trimmed = newName.trim();

      if (!trimmed) {
        setRenameError("Name cannot be empty.");
        return false;
      }

      if (trimmed.length > 32) {
        setRenameError("Name must be 32 characters or fewer.");
        return false;
      }

      const duplicate = worksheets.some(
        (w) =>
          w.id !== id && w.name.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (duplicate) {
        setRenameError("A worksheet with this name already exists.");
        return false;
      }

      try {
        await apiRenameWorksheet(id, trimmed);

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
      } catch (err) {
        console.error("Failed to rename worksheet", err);
        return false;
      }
    },
    [userData, setUserData, worksheets]
  );

  const deleteWorksheet = useCallback(
    async (id: string) => {
      if (!userData || isMainId(id)) return;

      try {
        await apiDeleteWorksheet(id);

        const nextList = worksheets.filter((w) => w.id !== id);
        let nextActiveId = userData.FYP.activeWorksheetID;
        if (nextActiveId === id) nextActiveId = nextList[0]?.id ?? "";

        setUserData({
          ...userData,
          FYP: {
            ...userData.FYP,
            worksheets: nextList,
            activeWorksheetID: nextActiveId,
          },
        });
      } catch (err) {
        console.error("Failed to delete worksheet", err);
      }
    },
    [userData, setUserData, worksheets, isMainId]
  );

  // ---------- Inline UI actions (nice for the dropdown) ----------
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

  const confirmDelete = useCallback(() => {
    if (!deleteTargetId) return;
    deleteWorksheet(deleteTargetId);
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

  const commitCreate = useCallback(() => {
    const trimmed = newWorksheetName.trim();

    if (!trimmed) {
      setNewWorksheetError("Name cannot be empty.");
      return;
    }

    if (trimmed.length > 32) {
      setNewWorksheetError("Name must be 32 characters or fewer.");
      return;
    }

    const duplicate = worksheets.some(
      (w) => w.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (duplicate) {
      setNewWorksheetError("A worksheet with this name already exists.");
      return;
    }

    createWorksheet(trimmed);
    cancelCreate();
  }, [newWorksheetName, worksheets, createWorksheet, cancelCreate]);

  return {
    worksheets,
    activeWorksheetId,
    activeWorksheet,
    activeSemesters,

    isMainId,
    setActiveWorksheet,
    createWorksheet,
    renameWorksheet,
    deleteWorksheet,

    addSemester,
    removeSemester,

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
  };
}
