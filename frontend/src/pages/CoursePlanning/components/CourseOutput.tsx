import { type Course } from "@/types/type-user";
import { formatCredits, formatDistributions } from "@/utils/formatHelpers";

import { useWorksheetActions } from "@/hooks/useWorksheetActions";

import cancel from "../assets/cancel.svg";

import { useDrag } from "react-dnd";
import { useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import clsx from "clsx";
import { GripVertical } from "lucide-react";

interface CourseOutputProps {
  course: Course;
  draggable?: boolean;
  removable?: boolean;
  semesterSeasonCode?: number;
  semesterCompleted?: boolean;
  worksheetClassId?: number;
  enrolledCourseCode?: string;
  onCourseClick?: (course: Course) => void;
}

function CourseOutput({
  course,
  draggable = true,
  removable = false,
  semesterSeasonCode = -1,
  semesterCompleted = false,
  worksheetClassId,
  enrolledCourseCode,
  onCourseClick,
}: CourseOutputProps) {
  const { removeCourse, updateEnrolledCourseCode } = useWorksheetActions();
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "course",
      item: {
        selectedCourse: course,
        enrolledCourseCode,
        sourceSemesterSeasonCode:
          semesterSeasonCode > 0 ? semesterSeasonCode : undefined,
      },
      canDrag: draggable && !semesterCompleted,
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [course, draggable, semesterCompleted, semesterSeasonCode, enrolledCourseCode],
  );

  drag(ref);

  const handleCourseRemove = async () => {
    const res = await removeCourse(semesterSeasonCode, course);
    if (!res.ok) {
      return;
    }
  };

  const handleCourseClick = () => {
    if (!onCourseClick || isDragging) return;
    onCourseClick(course);
  };

  const handleCourseKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    handleCourseClick();
  };

  return (
    <>
      <div
        className={clsx(
          "flex flex-col justify-between p-2 bg-gray-200 w-full h-24 rounded-md relative",
          draggable &&
            !semesterCompleted &&
            semesterSeasonCode < 1 &&
            "pl-7",
          isDragging
            ? "border-4 border-blue-200 cursor-grabbing"
            : draggable && !semesterCompleted
              ? "cursor-grab"
              : onCourseClick
                ? "cursor-pointer"
              : "",
        )}
        ref={ref}
        onClick={handleCourseClick}
        onKeyDown={handleCourseKeyDown}
        role={onCourseClick ? "button" : undefined}
        tabIndex={onCourseClick ? 0 : undefined}
      >
        {draggable && !semesterCompleted && semesterSeasonCode < 1 && (
          <GripVertical
            className="absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 pointer-events-none"
            aria-hidden
          />
        )}
        {removable && !semesterCompleted && (
          <button
            className="absolute top-0 right-0 h-5 w-5 m-1 active:scale-125 transition duration-300 ease-in-out cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleCourseRemove();
            }}
          >
            <img src={cancel} alt="cancel button"></img>
          </button>
        )}
        {worksheetClassId != null && course.codes.length > 1 ? (
          <select
            value={enrolledCourseCode || course.codes[0]}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              event.stopPropagation();
              void updateEnrolledCourseCode(
                semesterSeasonCode,
                worksheetClassId,
                event.target.value,
              );
            }}
            className="mr-6 max-w-full truncate rounded border border-gray-400 bg-white px-1 py-0.5 text-sm font-bold cursor-pointer"
            aria-label={`Enrolled code for ${course.title}`}
            title="Select the course code used on your transcript"
          >
            {course.codes.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        ) : (
          <p className="font-bold truncate overflow-hidden whitespace-nowrap">
            {enrolledCourseCode || course.codes[0]}
          </p>
        )}
        <p className="truncate overflow-hidden whitespace-nowrap">
          {course.title}
        </p>
        <div className="flex flex-row items-center justify-between">
          <p>{formatCredits(course.credit)}</p>
          {formatDistributions(course.dist)}
        </div>
      </div>
    </>
  );
}

export default CourseOutput;
