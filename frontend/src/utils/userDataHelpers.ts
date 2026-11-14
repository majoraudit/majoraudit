import type { MajorProgress } from "../types/type-program";
import { type User, type StudentSemester, type StudentCourse, type Course, type Worksheet} from "../types/type-user";

function getWorksheet(user:User) : Worksheet
{
    const worksheets = user?.FYP?.worksheets ?? [];

    const activeId = user.FYP.activeWorksheetID;
    let idx = activeId ? worksheets.findIndex(w => w.id === activeId) : -1;
    if (idx < 0) {
        idx = worksheets.findIndex(w => (w as any).isMain);
        if (idx < 0) idx = 0;
    }

    const target = worksheets[idx];

    return target;
}

export function addSemester(user: User, newSemester: StudentSemester): User {
    const ws = getWorksheet(user);
    if (!ws) return user;

    console.log("adding semester");

    // Prevent duplicate season in this worksheet
    const exists = ws.studentSemesters.some(
        s => s.season === newSemester.season
    );
    if (exists) {
        alert("A semester at this term and year was already created!");
        return user;
    }

    const updatedWorksheet = {
        ...ws,
        studentSemesters: [...ws.studentSemesters, newSemester].sort(
        (a, b) => a.season - b.season
        ),
    };

    return {
        ...user,
        FYP: {
        ...user.FYP,
        worksheets: (user.FYP.worksheets ?? []).map(w =>
            w.id === ws.id ? updatedWorksheet : w
        ),
        },
    };
}

export function removeSemester(user:User, removeSemester: StudentSemester): User {
    const ws = getWorksheet(user);
    if (!ws) return user;

    // Prevent duplicate season in this worksheet
    const exists = ws.studentSemesters.some(
        s => s.season === removeSemester.season
    );
    if (!exists) {
        alert("This semester already does not exist");
        return user;
    }

    const updatedWorksheet = {
        ...ws,
        studentSemesters: ws.studentSemesters
        .filter(s => s.season !== removeSemester.season)
        .sort((a, b) => a.season - b.season),
    };

    return {
        ...user,
        FYP: {
        ...user.FYP,
        worksheets: (user.FYP.worksheets ?? []).map(w =>
            w.id === ws.id ? updatedWorksheet : w
        ),
        },
    };
}

export function addCourse(user: User, newCourse: StudentCourse, season: number): User {
  const ws = getWorksheet(user);
  if (!ws) return user;

  const updatedSemesters = ws.studentSemesters.map((semester) => {
    if (semester.season !== season) return semester;

    const courseAlreadyExists = semester.studentCourses.some(
      (sc) => (sc.course.codes?.[0] === newCourse.course.codes?.[0] || (sc.course.id != null && sc.course.id === newCourse.course.id))
    );

    if (courseAlreadyExists) return semester;

    return {
      ...semester,
      studentCourses: [...semester.studentCourses, newCourse],
    };
  });

  const updatedWorksheet = { ...ws, studentSemesters: updatedSemesters };

  return {
    ...user,
    FYP: {
      ...user.FYP,
      worksheets: (user.FYP.worksheets ?? []).map((w) =>
        w.id === ws.id ? updatedWorksheet : w
      ),
    },
  };
}


export function removeCourse(user: User, removeCourse: Course, season: number): User {
    const ws = getWorksheet(user);
    if (!ws) return user;

    const updatedSemesters = ws.studentSemesters.map((semester) => {
        if (semester.season === season) {
            return {
            ...semester,
            studentCourses: semester.studentCourses.filter(course => (!(course.course.codes[0] === removeCourse.codes[0] && course.course.title === removeCourse.title)))
            }
        }

        return semester;
    });

    const updatedWorksheet = { ...ws, studentSemesters: updatedSemesters };

        return {
        ...user,
        FYP: {
        ...user.FYP,
        worksheets: (user.FYP.worksheets ?? []).map((w) =>
            w.id === ws.id ? updatedWorksheet : w
        ),
        },
    };
}

export function calcTotalSemesterCredits(user: User, season: number): number {
    const ws = getWorksheet(user);
    if (!ws) return 0;

    let totalCredits = 0;
    if(user)
    {
        const semester = ws.studentSemesters.find(s => s.season === season);
        if(semester)
            semester.studentCourses.map(course => totalCredits += Number(course.course.credit));
    }

    return totalCredits;
}

//calculates total completed credits or total planned credits
export function calcTotalCredits(user: User, isCompleted: boolean): number {
    const ws = getWorksheet(user);
    if (!ws) return 0;

    let totalCredits = 0;
    ws.studentSemesters.map(semester => {
        if(isCompleted) {
            if(semester.isCompleted) totalCredits += calcTotalSemesterCredits(user, semester.season);}
        else {
            if(!semester.isCompleted) totalCredits += calcTotalSemesterCredits(user, semester.season);}
        });

    return totalCredits;
}

//calculates total completed courses or total planned courses
export function calcTotalCourses(user:User, isCompleted:boolean) : number {
    const ws = getWorksheet(user);
    if (!ws) return 0;

    let totalCourses = 0;
    ws.studentSemesters.map(semester => {
        if(isCompleted) {
            if(semester.isCompleted) totalCourses += semester.studentCourses.length;}
        else {
            if(!semester.isCompleted) totalCourses += semester.studentCourses.length;}
        });

    return totalCourses;
}

export function updateIsCompleted(user: User, isCompleted: boolean, season: number): User {
   const ws = getWorksheet(user);
    if (!ws) return user;

    const updatedSemesters = ws.studentSemesters.map((semester) => {
    if (semester.season === season) {
        return {
        ...semester,
        isCompleted: isCompleted
      }
    }

    return semester;
  });

    const updatedWorksheet = { ...ws, studentSemesters: updatedSemesters };


    return {
        ...user,
        FYP: {
        ...user.FYP,
        worksheets: (user.FYP.worksheets ?? []).map((w) =>
            w.id === ws.id ? updatedWorksheet : w
        ),
        },
    };
}

export function addMajor(user: User, major: MajorProgress): User {
  const dp2 = user.FYP.degreeProgress2 ?? [];

  const newDegreeProgress2 = dp2.map(entry => {
    // Prevent duplicate in each worksheet
    const exists = entry.majors.some(m => m.id === major.id);
    return exists
      ? entry
      : { ...entry, majors: [...entry.majors, major] };
  });

  console.log(newDegreeProgress2)

  return {
    ...user,
    FYP: {
      ...user.FYP,
      statCount: {
        ...user.FYP.statCount,
        majorNum:
          major.info?.degreeType === "major" || major.info?.degreeType=== "Major"
            ? user.FYP.statCount.majorNum + 1
            : user.FYP.statCount.majorNum,
        certificateNum:
          major.info?.degreeType === "certificate" || major.info?.degreeType === "Certificate"
            ? user.FYP.statCount.certificateNum + 1
            : user.FYP.statCount.certificateNum,
      },
      degreeProgress2: newDegreeProgress2,
    },
  };
}

export function removeMajor(user: User, major: MajorProgress): User {
  const dp2 = user.FYP.degreeProgress2 ?? [];

  const newDegreeProgress2 = dp2.map(entry => ({
    ...entry,
    majors: entry.majors.filter(m => m.id !== major.id),
  }));

  console.log(newDegreeProgress2);

  return {
    ...user,
    FYP: {
      ...user.FYP,
      statCount: {
        ...user.FYP.statCount,
        majorNum:
          major.info?.degreeType === "major" || major.info?.degreeType === "Major"
            ? Math.max(0, user.FYP.statCount.majorNum - 1)
            : user.FYP.statCount.majorNum,
        certificateNum:
          major.info?.degreeType === "certificate" || major.info?.degreeType === "Certificate"
            ? Math.max(0, user.FYP.statCount.certificateNum - 1)
            : user.FYP.statCount.certificateNum,
      },
      degreeProgress2: newDegreeProgress2,
    },
  };
}
