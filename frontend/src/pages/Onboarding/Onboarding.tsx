import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useWorksheetManager } from "@/hooks/useWorksheetManager";
import { apiCreateSemester } from "@/api/semesters";
import { apiUpdateProfile } from "@/api/auth";
import { apiAddWorksheetMajor } from "@/api/worksheetMajors";

import {
  CLASS_YEARS,
  LANGUAGE_SUBJECTS,
  LANGUAGE_LEVELS,
} from "@/constants/onboarding";
import { type StudentSemester } from "@/types/type-user";

type SeasonCode = "FA" | "SP";

// Season code encoding: YYYYSS where SS = 01 (Spring), 03 (Fall)
// e.g. Fall 2023 → 202303, Spring 2024 → 202401
function toSeasonCode(year: number, season: SeasonCode): number {
  return year * 100 + (season === "SP" ? 1 : 3);
}

function toSeasonLabel(season: SeasonCode): string {
  return season === "SP" ? "Spring" : "Fall";
}

// Generates 8 semesters alternating Fall/Spring starting 4 years before graduation
// e.g. classYear 2027 → 2023 Fall, 2024 Spring, 2024 Fall, ..., 2026 Fall, 2027 Spring
function generateSemesters(
  classYear: number,
): { year: number; season: SeasonCode }[] {
  const semesters: { year: number; season: SeasonCode }[] = [];
  const startYear = classYear - 4;

  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) {
      semesters.push({ year: startYear + Math.floor(i / 2), season: "FA" });
    } else {
      semesters.push({ year: startYear + Math.floor(i / 2) + 1, season: "SP" });
    }
  }

  return semesters;
}

function Onboarding() {
  const { userData, setUserData } = useUser();
  const { createWorksheet } = useWorksheetManager();
  const navigate = useNavigate();

  const [first_name, setFirst_name] = useState(userData?.first_name ?? "");
  const [last_name, setLast_name] = useState(userData?.last_name ?? "");
  const [classYear, setClassYear] = useState(userData?.classYear ?? "");
  const [intendedLanguageCode, setIntendedLanguageCode] = useState(
    userData?.intendedLanguageCode ?? "",
  );
  const [languageLevel, setLanguageLevel] = useState(
    userData?.FYP?.languageRequirement ?? "L1",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    // 1. Save profile fields to backend (CustomUser).
    try {
      await apiUpdateProfile({
        class_year: classYear ? parseInt(classYear) : null,
        intended_language_code: intendedLanguageCode || "",
        language_requirement: languageLevel,
      });
    } catch (err) {
      console.error("Failed to save profile during onboarding", err);
    }

    // 2. Create the Main Worksheet — needed before we can attach majors.
    const newWorksheet = await createWorksheet("Main Worksheet");
    if (!newWorksheet) return;

    // 3. Auto-attach the general_degree major to the new worksheet.
    try {
      await apiAddWorksheetMajor(parseInt(newWorksheet.id), {
        major_id: "general_degree",
        specialization: "",
      });
    } catch (err) {
      console.error("Failed to add general_degree to new worksheet", err);
    }

    // 4. Create semesters via API using the new worksheet ID.
    const semesterTemplates = classYear
      ? generateSemesters(parseInt(classYear))
      : [];

    const createdSemesters = await Promise.all(
      semesterTemplates.map((s) =>
        apiCreateSemester(parseInt(newWorksheet.id), {
          year: s.year,
          season: s.season,
          title: `${toSeasonLabel(s.season)} ${s.year}`,
        }),
      ),
    );

    // 5. Map into frontend shape
    const studentSemesters: StudentSemester[] = createdSemesters.map(
      (s, i) => ({
        id: s.id,
        season: toSeasonCode(
          semesterTemplates[i].year,
          semesterTemplates[i].season,
        ),
        title: `${toSeasonLabel(semesterTemplates[i].season)} ${semesterTemplates[i].year}`,
        studentCourses: [],
        isCompleted: false,
      }),
    );

    // 6. Patch semesters + profile fields in one setUserData call.
    setUserData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        first_name: first_name.trim() || prev.first_name,
        last_name: last_name.trim() || prev.last_name,
        classYear: classYear || undefined,
        intendedLanguageCode: intendedLanguageCode || undefined,
        FYP: {
          ...prev.FYP,
          languageRequirement: languageLevel,
          worksheets: prev.FYP.worksheets.map((w) =>
            w.id === newWorksheet.id ? { ...w, studentSemesters } : w,
          ),
        },
      };
    });

    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        Welcome — tell us a bit about you
      </h1>
      <p className="text-slate-600 mb-6">
        This helps us personalize your plan. You can change these later.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            First name
          </label>
          <input
            type="text"
            value={first_name}
            onChange={(e) => setFirst_name(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Last name
          </label>
          <input
            type="text"
            value={last_name}
            onChange={(e) => setLast_name(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Expected graduation year
          </label>
          <select
            value={classYear}
            onChange={(e) => setClassYear(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="">Select year</option>
            {CLASS_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Language (foreign language plan)
          </label>
          <select
            value={intendedLanguageCode}
            onChange={(e) => setIntendedLanguageCode(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="">Select language</option>
            {LANGUAGE_SUBJECTS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Language level (L1–L5)
          </label>
          <select
            value={languageLevel}
            onChange={(e) => setLanguageLevel(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            {LANGUAGE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full cursor-pointer inline-flex items-center justify-center rounded-lg bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          Continue
        </button>
      </form>
    </div>
  );
}

export default Onboarding;
