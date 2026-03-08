import { type Course } from "@/types/type-user";
import { formatCredits, formatDistributions } from "@/utils/formatHelpers";

import { useWorksheetActions } from "@/hooks/useWorksheetActions";

import cancel from "../assets/cancel.svg";

import { useDrag } from "react-dnd";
import { useRef } from "react";
import clsx from "clsx";

interface CourseOutputProps {
  course: Course;
  draggable?: boolean;
  removable?: boolean;
  semesterSeasonCode?: number;
  semesterCompleted?: boolean;
  onCourseClick?: (course: Course) => void;
}

function CourseOutput({
  course,
  draggable = true,
  removable = false,
  semesterSeasonCode = -1,
  semesterCompleted = false,
  onCourseClick,
}: CourseOutputProps) {
  const { removeCourse } = useWorksheetActions();
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "course",
      item: {
        selectedCourse: course,
        sourceSemesterSeasonCode:
          semesterSeasonCode > 0 ? semesterSeasonCode : undefined,
      },
      canDrag: draggable && !semesterCompleted,
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [course, draggable, semesterCompleted, semesterSeasonCode],
  );

  drag(ref);

  const handleCourseRemove = () => {
    const res = removeCourse(semesterSeasonCode, course);
    if (!res.ok) {
      return;
    }
  };

  const handleCourseClick = () => {
    if (!onCourseClick || isDragging) return;
    onCourseClick(course);
  };

  const handleCourseKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    handleCourseClick();
  };

  return (
    <>
      <div
        className={clsx(
          "flex flex-col justify-between p-2 bg-gray-200 w-full h-24 rounded-md relative",
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
        <p className="font-bold truncate overflow-hidden whitespace-nowrap">
          {course.codes[0]}
          {/*<span className="text-gray-500 text-sm font-medium">
            {" "}
            ({formatSeason(course.seasons)})
          </span>*/}
        </p>
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
