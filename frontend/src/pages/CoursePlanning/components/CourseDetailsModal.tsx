import { useEffect, useMemo, useState } from "react";

import { type Course } from "@/types/type-user";

interface CourseTableProfessor {
  professor: {
    name: string;
  };
}

interface CourseTableMeeting {
  days_of_week: number;
  start_time: string;
  end_time: string;
}

interface CourseTableCrossListing {
  course_code: string;
  crn: number;
}

interface CourseTableListing {
  listing_id: number;
  crn: number;
  course_code: string;
  season_code: string;
  school: string;
  course: {
    title: string;
    description: string | null;
    requirements: string | null;
    syllabus_url: string | null;
    course_home_url: string | null;
    credits: number;
    section: string;
    classnotes: string | null;
    regnotes: string | null;
    rp_attr: string | null;
    final_exam: string | null;
    extra_info: string;
    skills: string[];
    areas: string[];
    listings: CourseTableCrossListing[];
    course_professors: CourseTableProfessor[];
    course_meetings: CourseTableMeeting[];
  };
}

interface CourseTableProxyResponse {
  listing: CourseTableListing;
}

interface CourseDetailsModalProps {
  open: boolean;
  course: Course | null;
  onClose: () => void;
}

function seasonCodeToLabel(seasonCode: string): string {
  const year = Number(seasonCode.slice(0, 4));
  const term = seasonCode.slice(4);

  if (term === "01") return `Spring ${year}`;
  if (term === "02") return `Summer ${year}`;
  if (term === "03") return `Fall ${year}`;
  return seasonCode;
}

function formatCredits(credits: number): string {
  return `${credits} Credit${credits === 1 ? "" : "s"}`;
}

function formatTime(raw: string): string {
  const [hourText, minuteText] = raw.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return raw;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatDaysOfWeek(daysMask: number): string {
  if (!daysMask) return "TBA";

  const dayMap: Array<{ value: number; label: string }> = [
    { value: 1, label: "M" },
    { value: 2, label: "T" },
    { value: 4, label: "W" },
    { value: 8, label: "Th" },
    { value: 16, label: "F" },
    { value: 32, label: "Sa" },
    { value: 64, label: "Su" },
  ];

  return dayMap
    .filter((day) => (daysMask & day.value) !== 0)
    .map((day) => day.label)
    .join("");
}

function DataField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="grid grid-cols-12 gap-3 py-1.5">
      <div className="col-span-4 sm:col-span-3">
        <span className="text-sm font-semibold text-gray-500">{label}</span>
      </div>
      <div className="col-span-8 sm:col-span-9 text-sm font-medium text-gray-800 whitespace-pre-wrap">
        {value}
      </div>
    </div>
  );
}

function CourseDetailsModal({
  open,
  course,
  onClose,
}: CourseDetailsModalProps) {
  const [courseTableListing, setCourseTableListing] =
    useState<CourseTableListing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !course) {
      setCourseTableListing(null);
      setIsLoading(false);
      setLoadError("");
      return;
    }

    const courseCode = course.codes.find(Boolean);
    if (!courseCode) {
      setCourseTableListing(null);
      setIsLoading(false);
      setLoadError("No valid course code found for CourseTable lookup.");
      return;
    }

    const controller = new AbortController();

    async function fetchCourseTableData() {
      try {
        if (!open || !course) {
          setCourseTableListing(null);
          setIsLoading(false);
          setLoadError("");
          return;
        }

        const courseCode = course.codes.find(Boolean);
        if (!courseCode) {
          setCourseTableListing(null);
          setIsLoading(false);
          setLoadError("No valid course code found for CourseTable lookup.");
          return;
        }

        const query = new URLSearchParams({
          course_code: courseCode as string,
        });
        const response = await fetch(`/api/courses/coursetable/?${query}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load CourseTable data.");
        }

        const payload = (await response.json()) as CourseTableProxyResponse;
        setCourseTableListing(payload.listing);
      } catch {
        if (!controller.signal.aborted) {
          setLoadError(
            "CourseTable content is unavailable for this course right now.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchCourseTableData();

    return () => controller.abort();
  }, [open, course]);

  const displayCodes = useMemo(() => {
    if (courseTableListing?.course.listings?.length) {
      return courseTableListing.course.listings.map(
        (listing) => listing.course_code,
      );
    }
    return course?.codes ?? [];
  }, [courseTableListing, course]);

  const displayTitle =
    courseTableListing?.course.title ?? course?.title ?? "Course";
  const displaySeason = courseTableListing
    ? seasonCodeToLabel(courseTableListing.season_code)
    : null;
  const displayDescription =
    courseTableListing?.course.description?.trim() ||
    "No description available.";
  const displayRequirements =
    courseTableListing?.course.requirements?.trim() || null;
  const displayCredits =
    courseTableListing?.course.credits ?? Number(course?.credit ?? 0);
  const displayProfessors = courseTableListing?.course.course_professors
    .map((entry) => entry.professor.name)
    .join(" • ");
  const displayMeetings = courseTableListing?.course.course_meetings
    .map((meeting) => {
      const dayText = formatDaysOfWeek(meeting.days_of_week);
      const timeText = `${formatTime(meeting.start_time)}-${formatTime(meeting.end_time)}`;
      return `${dayText} ${timeText}`;
    })
    .join("\n");
  const syllabusUrl =
    courseTableListing?.course.syllabus_url ||
    courseTableListing?.course.course_home_url ||
    null;
  const tags = [
    ...(courseTableListing?.course.skills ?? []),
    ...(courseTableListing?.course.areas ?? []),
  ];

  if (!open || !course) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[86vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold leading-tight text-gray-900">
                {displayTitle}
                {displaySeason && (
                  <span className="ml-2 text-base font-normal text-gray-500">
                    ({displaySeason})
                  </span>
                )}
              </h2>
              <p className="mt-1 truncate text-sm text-gray-600">
                {displayCodes.join(" • ")}
              </p>
            </div>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-2xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              onClick={onClose}
              aria-label="Close course details"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {displayCredits > 0 && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {formatCredits(displayCredits)}
              </span>
            )}
            {(course.dist ?? []).map((distribution) => (
              <span
                key={distribution}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
              >
                {distribution}
              </span>
            ))}
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {isLoading && (
            <p className="text-sm text-gray-500">
              Loading CourseTable modal content...
            </p>
          )}

          <section>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
              {displayDescription}
            </p>
            {displayRequirements && (
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-rose-500">
                {displayRequirements}
              </p>
            )}
          </section>

          <div className="border-t border-gray-200 pt-3">
            {syllabusUrl && (
              <div className="grid grid-cols-12 gap-3 py-1.5">
                <div className="col-span-4 sm:col-span-3">
                  <span className="text-sm font-semibold text-gray-500">
                    Syllabus
                  </span>
                </div>
                <div className="col-span-8 sm:col-span-9 text-sm font-medium text-blue-700">
                  <a
                    href={syllabusUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Open syllabus
                  </a>
                </div>
              </div>
            )}
            <DataField label="Professor" value={displayProfessors || "TBA"} />
            <DataField label="Meetings" value={displayMeetings || "TBA"} />
            <DataField
              label="Section"
              value={courseTableListing?.course.section || null}
            />
            <DataField
              label="School"
              value={courseTableListing?.school || null}
            />
            <DataField
              label="Class notes"
              value={courseTableListing?.course.classnotes || null}
            />
            <DataField
              label="Registrar notes"
              value={courseTableListing?.course.regnotes || null}
            />
            <DataField
              label="Reading period"
              value={courseTableListing?.course.rp_attr || null}
            />
            <DataField
              label="Final exam"
              value={
                courseTableListing?.course.final_exam === "HTBA"
                  ? null
                  : (courseTableListing?.course.final_exam ?? null)
              }
            />
          </div>

          {loadError && <p className="text-xs text-amber-700">{loadError}</p>}
        </div>
      </div>
    </div>
  );
}

export default CourseDetailsModal;
