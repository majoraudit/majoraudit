import { type Course } from "@/types/type-user";
import { removeCourse } from "@/utils/userDataHelpers";
import {
  formatSeason,
  formatCredits,
  formatDistributions,
} from "@/utils/formatHelpers";

import { useUser } from "@/contexts/UserContext";

import cancel from "../assets/cancel.svg";

import { useDrag } from "react-dnd";
import { useRef, useState } from "react";
import clsx from "clsx";

interface CourseOutputProps {
  course: Course;
  draggable?: boolean;
  removable?: boolean;
  semesterSeasonCode?: number;
  semesterCompleted?: boolean;
}

function CourseOutput({
  course,
  draggable = true,
  removable = false,
  semesterSeasonCode = -1,
  semesterCompleted = false,
}: CourseOutputProps) {
  const { userData, setUserData } = useUser();
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "course",
      item: { selectedCourse: course },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [course]
  );

  const [isDraggable, setIsDraggable] = useState(draggable);

  if (draggable) {
    drag(ref);
  }

  const handleCourseRemove = () => {
    if (userData)
      setUserData(removeCourse(userData, course, semesterSeasonCode));
  };

  return (
    <>
      <div
        className={clsx(
          "flex flex-col justify-between p-2 bg-gray-200 w-full h-24 rounded-md relative",
          isDragging
            ? "border-4 border-blue-200 cursor-grabbing"
            : isDraggable
            ? "cursor-grab"
            : ""
        )}
        ref={ref}
      >
        {removable && !semesterCompleted && (
          <button
            className="absolute top-0 right-0 h-5 w-5 m-1 active:scale-125 transition duration-300 ease-in-out cursor-pointer"
            onClick={handleCourseRemove}
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
