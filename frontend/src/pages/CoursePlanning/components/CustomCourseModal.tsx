// modal.tsx
import React, { useEffect, useState } from "react";
import type { StudentSemester } from "@/types/type-user";

interface CustomCourseModalProps {
  open: boolean;
  onClose: () => void;
  semester: StudentSemester | null;
  onCreate?: (
    semester: StudentSemester,
    data: {
      title: string;
      code: string;
      distribution: string;
      credits: number;
    }
  ) => void;
}

function getSemesterDisplay(semester: StudentSemester) {
  const seasonStr = semester.season.toString();
  const yearPart = Number(seasonStr.slice(0, 4));
  const termCode = seasonStr.slice(-2); // "03", "01", "02"

  let termLabel = "";
  let academicStart = yearPart;
  let academicEnd = yearPart + 1;

  if (termCode === "03") {
    termLabel = "Fall";
    academicStart = yearPart;
    academicEnd = yearPart + 1;
  } else if (termCode === "01") {
    termLabel = "Spring";
    academicStart = yearPart - 1;
    academicEnd = yearPart;
  } else if (termCode === "02") {
    termLabel = "Summer";
    academicStart = yearPart - 1;
    academicEnd = yearPart;
  } else {
    termLabel = "Unknown term";
  }

  return {
    termLabel,
    academicYearLabel: `${academicStart}-${academicEnd}`,
  };
}

const CustomCourseModal: React.FC<CustomCourseModalProps> = ({
  open,
  onClose,
  semester,
  onCreate,
}) => {
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [distribution, setDistribution] = useState("");
  const [credits, setCredits] = useState("1");
  const [error, setError] = useState("");

  // reset form when opening / switching semester
  useEffect(() => {
    if (open) {
      setCourseTitle("");
      setCourseCode("");
      setDistribution("");
      setCredits("1");
      setError("");
    }
  }, [open, semester]);

  if (!open || !semester) return null;

  const { termLabel, academicYearLabel } = getSemesterDisplay(semester);

  const handleSubmit = () => {
    if (!courseTitle.trim()) {
      setError("Course name is required.");
      return;
    }

    if (!distribution) {
      setError("Please select a distributional requirement.");
      return;
    }

    const parsedCredits = Number(credits);
    if (!Number.isFinite(parsedCredits) || parsedCredits <= 0) {
      setError("Credits must be a number greater than 0.");
      return;
    }

    if (onCreate) {
      onCreate(semester, {
        title: courseTitle.trim(),
        code: courseCode.trim(),
        distribution,
        credits: parsedCredits,
      });
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / context */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Add custom course
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {semester.title || "Untitled semester"} &bull; {termLabel} •{" "}
              {academicYearLabel}
            </p>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="font-medium text-gray-700">
              Course name <span className="text-red-500">*</span>
            </label>
            <input
              className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Independent Study, Research, Transfer Credit"
              value={courseTitle}
              onChange={(e) => {
                setCourseTitle(e.target.value);
                setError("");
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-gray-700">Course code</label>
            <input
              className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. CPSC 490, RSEA 123"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-gray-700">
              Credits <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 1"
              value={credits}
              onChange={(e) => {
                setCredits(e.target.value);
                setError("");
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-gray-700">
              Distribution <span className="text-red-500">*</span>
            </label>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={distribution}
              onChange={(e) => {
                setDistribution(e.target.value);
                setError("");
              }}
            >
              <option value="" disabled>
                Select a distribution
              </option>
              <option value="Hu">Humanity</option>
              <option value="Sc">Science</option>
              <option value="So">Social Science</option>
              <option value="QR">Quant. Reasoning</option>
              <option value="WR">Writing</option>
              <option value="L1">Language</option>
            </select>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-md border bg-white text-sm hover:bg-gray-50 cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-md bg-brand-blue text-white text-sm font-medium hover:bg-blue-700 cursor-pointer"
            onClick={handleSubmit}
          >
            Save custom course
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomCourseModal;
