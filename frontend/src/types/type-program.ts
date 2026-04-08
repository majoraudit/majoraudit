
import { type Course, type StudentCourse } from "./type-user";
import { CourseDatabase } from "../services/CourseDatabase";

interface DUS {
	name: string[];
	email: string[];
}

interface DegreeMetadataStats {
	courses: number;
	rating: number;
	workload: number;
	type: string;
}

export interface DegreeMetadata {
	name: string;
	abbr: string;
	degreeType: string;
	stats: DegreeMetadataStats;
	students: number;
	about: string;
	dus: DUS;
	catalogLink: string;
	websiteLink: string;
	majorEmail: string;
}

// Major templates for outlining major requirements and basic display --> when you view majors, it will auto make a Major Progerssion object to see requirements + progress

// CourseItemTemplate --> make it one with multiple selection options... also have a display function feature
// CourseItemProgress --> for major showing... only difference is that it shows if its completed... extend the original
// GroupItemTemplate --> has multiple CourseItems + title + description + number of courses
// GroupItemProgress --> extends with completedNumberOfCourses

/*
 multi-choice --> choose # from these options
 combo-choice --> these courses count as #
 range-choice --> need # of courses of subject code ? between min and max range
 level-choice --> need # of courses of subject code ? above this level
 category-choice --> need # of courses of category ?
 language-choice --> need # of courses of category ? and subject code ?
 */

 // make helper function for writing descriptions

interface SingleChoiceCourseItemTemplate {
	type: "single-choice";
	courseCode: string;
}

interface SingleChoiceCourseItemProgress extends SingleChoiceCourseItemTemplate {
	isCompleted: boolean;
	completedCourses: StudentCourse[];
}

interface MultiChoiceCourseItemTemplate {
	type: "multi-choice";
	courseCodes: string[];
}

interface MultiChoiceCourseItemProgress extends MultiChoiceCourseItemTemplate {
	isCompleted: boolean;
	completedCourses: StudentCourse[];
}

interface ComboChoiceCourseItemTemplate {
	type: "combo-choice";
	courseCodes: string[];
	countAs: number;
}

interface ComboChoiceCourseItemProgress extends ComboChoiceCourseItemTemplate {
	isCompleted: boolean;
	completedCourses: StudentCourse[];
}

interface RangeChoiceCourseItemTemplate {
	type: "range-choice";
	subjectCode: string[];
	minLevel: number;
	maxLevel: number;
}

interface RangeChoiceCourseItemProgress extends RangeChoiceCourseItemTemplate {
	isCompleted: boolean;
	completedCourses: StudentCourse[];
}

interface LevelChoiceCourseItemTemplate {
	type: "level-choice";
	subjectCode: string[];
	level: number;
}

interface LevelChoiceCourseItemProgress extends LevelChoiceCourseItemTemplate {
	isCompleted: boolean;
	completedCourses: StudentCourse[];
}

interface CategoryChoiceCourseItemTemplate {
	type: "category-choice";
	category: string[];
}

interface CategoryChoiceCourseItemProgress extends CategoryChoiceCourseItemTemplate {
	isCompleted: boolean;
	completedCourses: StudentCourse[];
}

// for language (CHNS + L1) or for other designations (such as as AFAM + Hu)
interface DesignationChoiceCourseItemTemplate {
	type: "designation-choice"; 
	category: string[];
	subjectCodes: string[];
}

interface DesignationChoiceCourseItemProgress extends DesignationChoiceCourseItemTemplate {
	isCompleted: boolean;
	completedCourses: StudentCourse[];
}

// Union types for polymorphism
export type CourseItemTemplateType = 
	| SingleChoiceCourseItemProgress
	| MultiChoiceCourseItemTemplate
	| ComboChoiceCourseItemTemplate
	| RangeChoiceCourseItemTemplate
	| LevelChoiceCourseItemTemplate
	| CategoryChoiceCourseItemTemplate
	| DesignationChoiceCourseItemTemplate;

export type CourseItemProgressType = 
	| SingleChoiceCourseItemProgress
	| MultiChoiceCourseItemProgress
	| ComboChoiceCourseItemProgress
	| RangeChoiceCourseItemProgress
	| LevelChoiceCourseItemProgress
	| CategoryChoiceCourseItemProgress
	| DesignationChoiceCourseItemProgress;

export interface GroupItemTemplate {
	description: string;
	requiredNum: number;
	courseItems: CourseItemTemplateType[];
}

export interface GroupItemProgress extends GroupItemTemplate {
	courseItems: CourseItemProgressType[];
	isCompleted: boolean;
	completedNum: number;
}

export interface MajorTemplate {
	id: string;
	name: string;
	totalCourses: number;
	totalRequirementGroups: number;
	requirements: GroupItemTemplate[];
	info: DegreeMetadata;
};

export interface MajorProgress extends MajorTemplate {
	requirements: GroupItemProgress[];
	totalCompletedCourses: number;
	totalCompletedRequirementGroups: number;
};

export interface AppData {
	courses: Course[];
	major_templates: {id: string; name: string}[];
	course_database: CourseDatabase;
}
