import { type StudentSemester } from "@/types/type-user";
import { type Course } from "@/types/type-user";
import {
  removeSemester,
  addCourse,
  calcTotalSemesterCredits,
  updateIsCompleted,
} from "@/utils/userDataHelpers";

import { useUser } from "@/contexts/UserContext";

import CourseOutput from "./CourseOutput";
import BlankCourseOutput from "./BlankCourseOutput";

import trashcan from "../assets/trashcan.svg";
import lockAnimation from "../assets/lockAnimation.json";

import { useDrop } from "react-dnd";
import { useRef, useEffect, useMemo } from "react";
import clsx from "clsx";
import Lottie from "lottie-react";
import type { LottieRefCurrentProps } from "lottie-react";

interface SemesterOutputProps {
  semester: StudentSemester;
  onAddCustomCourse?: () => void;
}

function codeToYear(code: number): number {
  let year = Math.floor(code / 100);
  if (code % 100 == 2 || code % 100 == 1) {
    year -= 1;
  }

  return year;
}

// semester prop, mainly to specify the season code
function SemesterOutput({ semester, onAddCustomCourse }: SemesterOutputProps) {
  const { userData, setUserData } = useUser();

  const activeWorksheetId = userData?.FYP?.activeWorksheetID; // undefined => Main Worksheet (baseline)

  const worksheets = userData?.FYP?.worksheets ?? [];

  const activeSemesters: StudentSemester[] = useMemo(() => {
    if (!userData) return [];
    const ws = worksheets.find((w) => w.id === activeWorksheetId);
    return ws?.studentSemesters ?? [];
  }, [userData, activeWorksheetId, worksheets]);

  // semester doesn't auto update as a prop --> need this to get userData which auto updates
  const updatedSemester =
    activeSemesters.find((s) => s.season === semester.season) ?? semester;

  const isCompleted = updatedSemester.isCompleted ?? false;

  const lottieRef = useRef<LottieRefCurrentProps | null>(null);

  useEffect(() => {
    if (lottieRef.current && !isCompleted) {
      lottieRef.current.goToAndStop(lockAnimation.op / 2, true);
    }
  }, []);

  const handleUpdateIsCompleted = () => {
    if (!lottieRef.current) return;

    const newCompletedState = !isCompleted;

    if (newCompletedState) {
      lottieRef.current.playSegments(
        [lockAnimation.op / 2, lockAnimation.op],
        true
      );
    } else {
      lottieRef.current.playSegments(
        [lockAnimation.op, lockAnimation.op / 2],
        true
      );
    }

    //setIsCompleted(newCompletedState);
    if (userData)
      setUserData(
        updateIsCompleted(userData, newCompletedState, semester.season)
      );
  };

  // drop logic
  // ref needed to connect drop logic to target
  const ref = useRef<HTMLDivElement>(null);

  // useDrop hook --> only accepts courses, handles drop functionality by adding the course,
  //                  recreates hook when userData or semester.season changes
  const [{ isOver }, drop] = useDrop<
    { selectedCourse: Course },
    void,
    { isOver: boolean }
  >(
    () => ({
      accept: "course",
      drop: (item) => {
        if (userData) {
          const updatedUser = addCourse(
            userData,
            {
              course: item.selectedCourse,
              term: semester.season,
              status: "DA_COMPLETE",
            },
            semester.season
          );

          setUserData(updatedUser);
        }
      },
      canDrop: () => !isCompleted,
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [userData, semester.season, isCompleted]
  );

  // connects useDrop to DOM element
  drop(ref);

  const handleSemesterRemove = () => {
    if (userData) setUserData(removeSemester(userData, semester));
  };

  return (
    <>
      <div
        className={clsx(
          "flex flex-col border-4  p-4 m-6 rounded-xl",
          isCompleted
            ? "border-green-700 bg-[#F4F7F1] duration-500"
            : isOver
            ? "border-blue-200 bg-gray-50 duration-200"
            : "border-gray-300 bg-gray-50 duration-500"
        )}
        ref={ref}
      >
        <div className="flex flex-row items-center justify-between">
          <h2 className="flex items-center text-xl font-bold mb-2 gap-2">
            {updatedSemester.title}
            {"  "}
            <span className="text-base text-gray-600 mt-1">
              {codeToYear(semester.season)}-{codeToYear(semester.season) + 1}
            </span>
            <button
              className="h-8 w-8 cursor-pointer"
              onClick={handleUpdateIsCompleted}
            >
              <Lottie
                lottieRef={lottieRef}
                animationData={lockAnimation}
                autoplay={false}
                loop={false}
              />
            </button>
          </h2>
          <h2 className="text-base text-gray-600 font-bold mb-2">
            Total Credits:{" "}
            {userData && calcTotalSemesterCredits(userData, semester.season)}
          </h2>
        </div>
        <ul className="flex flex-row p-2 gap-4 flex-wrap">
          {updatedSemester.studentCourses.map((studentCourse, index) => (
            <li key={index}>
              <div className="w-54">
                <CourseOutput
                  course={studentCourse.course}
                  draggable={false}
                  removable={true}
                  semesterSeasonCode={updatedSemester.season}
                  semesterCompleted={isCompleted}
                />
              </div>
            </li>
          ))}
          {!isCompleted && (
            <li>
              <button
                type="button"
                className="w-54 cursor-pointer"
                onClick={onAddCustomCourse}
              >
                <BlankCourseOutput />
              </button>
            </li>
          )}
        </ul>
        {!isCompleted && (
          <button onClick={handleSemesterRemove}>
            <img
              src={trashcan}
              alt="trashcan"
              className="h-6 w-6 float-right active:scale-125 transition duration-300 ease-in-out cursor-pointer"
            ></img>
          </button>
        )}
        {isCompleted && <div className="h-6 w-6 float-right"></div>}
      </div>
    </>
  );
}

export default SemesterOutput;
