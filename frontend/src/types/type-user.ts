
import {type MajorTemplate, type MajorProgress} from "./type-program";

export interface Course {
  id: number;
  codes: string[]; 		// ["FREN 403", "HUMS 409"]
  title: string; 			// "Proust Interpretations: Reading <i>Remembrance of Things Past</i>"
  credit: number; 		// 1
  dist: string[]; 		// ["Hu"]
  tags: string[];
  //seasons: string[]; 	// ["Spring"]
  //season_codes: string[]; // ["202601", "202503"]
}

export interface StudentCourse {
  course: Course; 	
	term: number; 		// 202401
  status: string; 	// "DA_COMPLETE" | "DA_PROSPECT" | "MA_VALID" | "MA_HYPOTHETICAL"
  manualFulfillInfo?: {manualFulfill: boolean, groupIdx: Number, itemIdx: Number}; // whether this course was manually added by the user
}

// 01 - spring, 02 - summer, 03 - fall
export interface StudentSemester {
    season: number;
    title: string;
	  studentCourses: StudentCourse[];
    isCompleted: boolean; // completed (true) vs planned (false)
}

export interface Worksheet {
  id: string;
  name: string;
  studentSemesters: StudentSemester[];
}

interface ProgramStats 
{
  majorNum: number;
  certificateNum: number;
}

export interface FYP {
	languageRequirement: string;
	//studentSemesters: StudentSemester[];

  // shows degree, major, certificate requirements
  // degreeConfigurations: MajorRequirement[];

  degreeProgress: MajorProgress[];
  degreeProgress2:
    {
      worksheetID: string;
      majors: MajorProgress[];
    }[];
  statCount: ProgramStats; // how many majors added, how many certificates added

	//degreeConfigurations: DegreeConfiguration[][];
	//degreeDeclarations: StudentDegree[];
  worksheets: Worksheet[]; 
  activeWorksheetID: string;
}

export interface User {
	first_name: string;
  last_name: string;
	netID: string;
	//onboard: boolean;
	classYear?: string; 
	intendedMajorId?: string;
	intendedLanguageCode?: string;
	FYP: FYP;
}
