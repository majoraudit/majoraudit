import { type StudentSemester } from "@/types/type-user";
import { type Course, type StudentCourse } from "@/types/type-user";

import CourseOutput from "./CourseOutput";
import BlankCourseOutput from "./BlankCourseOutput";

import trashcan from "../assets/trashcan.svg";
import lockAnimation from "../assets/lockAnimation.json";

import { useWorksheetManager } from "@/hooks/useWorksheetManager";
import { useWorksheetActions } from "@/hooks/useWorksheetActions";
import { useWorksheetData } from "@/hooks/useWorksheetData";
import { addCourseToSemester } from "@/api/coursePlanning";
import { useUser } from "@/contexts/UserContext";

import { useDrop } from "react-dnd";
import { useRef, useEffect } from "react";
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
  const { setSemesterCompleted } = useWorksheetActions();
  const { activeSemesters, removeSemester, activeWorksheetId } = useWorksheetManager();
  const { getSemesterCredits } = useWorksheetData();

  const updatedSemester =
    activeSemesters.find((s) => s.season === semester.season) ?? semester;

  const isCompleted = updatedSemester.isCompleted ?? false;

  const lottieRef = useRef<LottieRefCurrentProps | null>(null);

  const ip = lockAnimation.ip ?? 0;
  const op = lockAnimation.op ?? 0;
  const mid = Math.floor((ip + op) / 2);

  useEffect(() => {
    if (!lottieRef.current) return;

    // Snap to correct resting pose for the current state
    lottieRef.current.goToAndStop(isCompleted ? op : mid, true);
  }, [isCompleted, op, mid]);

  const handleUpdateIsCompleted = () => {
    if (!lottieRef.current) return;

    const newCompletedState = !isCompleted;

    if (newCompletedState) {
      // unlocked -> locked
      lottieRef.current.playSegments([mid, op], true);
    } else {
      // locked -> unlocked
      lottieRef.current.playSegments([ip, mid], true);
    }

    setSemesterCompleted(updatedSemester.season, newCompletedState);
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
        if (!userData) return;

        const newStudentCourse: StudentCourse = {
          course: item.selectedCourse,
          term: semester.season,
          status: "DA_COMPLETE",
        };

        // Write directly to userData to avoid stale closure issues with useWorksheetActions
        setUserData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            FYP: {
              ...prev.FYP,
              worksheets: prev.FYP.worksheets.map((ws) => {
                if (ws.id !== activeWorksheetId) return ws;
                return {
                  ...ws,
                  studentSemesters: ws.studentSemesters.map((s) => {
                    if (s.id !== semester.id) return s;
                    const alreadyExists = s.studentCourses.some(
                      (sc) => sc.course.codes?.[0] === item.selectedCourse.codes?.[0]
                    );
                    if (alreadyExists) return s;
                    return {
                      ...s,
                      studentCourses: [...s.studentCourses, newStudentCourse],
                    };
                  }),
                };
              }),
            },
          };
        });

        // Persist to backend
        if (activeWorksheetId && semester.id) {
          addCourseToSemester(activeWorksheetId, semester.id, {
            course_id: item.selectedCourse.id,
          }).catch(console.error);
        }
      },
      canDrop: () => !isCompleted,
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [userData, setUserData, isCompleted, activeWorksheetId, semester.id],
  );

  // connects useDrop to DOM element
  drop(ref);

  const handleSemesterRemove = () => {
    // removeSemester from useWorksheetManager calls the API and updates local state
    removeSemester(semester.id);
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
              : "border-gray-300 bg-gray-50 duration-500",
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
            Total Credits: {getSemesterCredits(updatedSemester.season)}
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
