import type { MQLQueryFile } from "@/types/schema/mql/mql";
import type { SolveResult } from "./audit";

export async function apiFetchMajorTemplatesList(): Promise<string[]> {
  const res = await fetch("/api/majors/", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch major list");
  return res.json();
}

export async function apiFetchMajorTemplate(majorId: string) {
  const res = await fetch(`/api/majors/${majorId}/`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch major template ${majorId}`);
  return res.json();
}

export interface MajorPreview {
  major_id: string;
  degree_type: string;
  name: string;
  mql_file: MQLQueryFile;
  solve_result: SolveResult | null;
}

export async function apiFetchMajorPreview(
  majorId: string,
  degreeType: string,
  worksheetId?: number,
): Promise<MajorPreview> {
  const qs = worksheetId != null ? `?worksheet_id=${worksheetId}` : "";
  const res = await fetch(
    `/api/majors/${majorId}/${degreeType}/preview/${qs}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`Failed to fetch preview ${majorId}_${degreeType}`);
  return res.json();
}
