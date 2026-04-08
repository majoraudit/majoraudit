
import {type MajorTemplate, type MajorProgress} from "./type-program";

export interface Course {
  id: string;
  codes: string[]; 		// ["FREN 403", "HUMS 409"]
  title: string; 			// "Proust Interpretations: Reading <i>Remembrance of Things Past</i>"
  credit: number; 		// 1
  dist: string[]; 		// ["Hu"]
  tags: string[];
  //seasons: string[]; 	// ["Spring"]
  //season_codes: string[]; // ["202601", "202503"]
}

export interface UserMajor {
  id: number;
  major_id: string;
  specialization: string;
  added_at: string;
}

export interface StudentCourse {
  worksheetClassId?: number;
  course: Course; 	
	term: number; 		// 202401
  status: string; 	// "DA_COMPLETE" | "DA_PROSPECT" | "MA_VALID" | "MA_HYPOTHETICAL"
  manualFulfillInfo?: {manualFulfill: boolean, groupIdx: Number, itemIdx: Number}; // whether this course was manually added by the user
}

// 01 - spring, 02 - summer, 03 - fall
export interface StudentSemester {
    id: number;
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
	
  worksheets: Worksheet[]; 
  activeWorksheetID: string;
  languageRequirement: string;
  majors : UserMajor[];
}

export interface User {
	first_name: string;
  last_name: string;
	netID: string;
	classYear?: string; 
	intendedMajorId?: string;
	intendedLanguageCode?: string;
	FYP: FYP;
}
