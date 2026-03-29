import {type MajorProgress } from "../types/type-program";
import { mockCourses } from "./mock_courses";
import {getCourse} from "../data/mock_courses"; 

const studentCourse = {
      course: mockCourses[1],
        term: 202401,
      status: "DA_COMPLETE"
}

const CPSC_2010 = 
{
    id: 1,
    codes: ["CPSC 2020"],
    title: "Introduction to Computer Science",
    credit: 1,
    dist: ["QR"],
    seasons: ["Fall"],
    season_codes: ["202503"]
}

const CPSC_2020 = 
{
    codes: ["CPSC 2020"],
    title: "Mathematical Tools for Computer Science",
    credit: 1,
    dist: ["QR"],
    seasons: ["Fall"],
    season_codes: ["202503"]
}

const CPSC_2230 = 
{
    codes: ["CPSC 2230"],
    title: "Data Structures and Programming Techniques",
    credit: 1,
    dist: ["QR"],
    seasons: ["Fall"],
    season_codes: ["202503"]
}

const CPSC_3230 = 
{
    codes: ["CPSC 3230"],
    title: "Introduction to Systems Programming and Computer Organization",
    credit: 1,
    dist: ["QR"],
    seasons: ["Fall"],
    season_codes: ["202503"]
}

const CPSC_3650 = 
{
    codes: ["CPSC 3650", "ECON 3365"],
    title: "Algorithms",
    credit: 1,
    dist: ["QR"],
    seasons: ["Fall"],
    season_codes: ["202503"]
}

const CPSC_4900 = 
{
    codes: ["CPSC 4900"],
    title: "Senior Project",
    credit: 1,
    dist: [],
    seasons: ["Fall"],
    season_codes: ["202503"]
}

export const general_requirements_progress: MajorProgress = {
    id: "gen_req_001",
    name: "General Requirements",
    totalCourses: 13,
    totalCompletedCourses: 5,
    totalRequirementGroups: 6,
    totalCompletedRequirementGroups: 0,
    requirements: [
        {
            description: "Humanity",
            requiredNum: 2, // Need 2 course items to complete this group
            courseItems: [
                {
                    type: "category-choice",
                    category: ["Hu"],
                    isCompleted: false,
                    completedCourses: [
                        {course: CPSC_2010, term: 202401, status: "DA_COMPLETE", manualFulfillInfo: {manualFulfill: true, groupIdx: 1, itemIdx: 1}},
                    ]
                },
                {
                    type: "category-choice",
                    category: ["Hu"],
                    isCompleted: false,
                    completedCourses: []
                }
            ],
            isCompleted: false,
            completedNum: 1
        },
        {
            description: "Science",
            requiredNum: 2,
            courseItems: [
                {
                    type: "category-choice",
                    category: ["Sc"],
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "category-choice",
                    category: ["Sc"],
                    isCompleted: false,
                    completedCourses: []
                }
            ],
            isCompleted: false,
            completedNum: 1
        },
        {
            description: "Social Science",
            requiredNum: 2,
            courseItems: [
                {
                    type: "category-choice",
                    category: ["So"],
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "category-choice",
                    category: ["So"],
                    isCompleted: false,
                    completedCourses: []
                }
            ],
            isCompleted: false,
            completedNum: 1
        },
        {
            description: "Quant. Reasoning",
            requiredNum: 2,
            courseItems: [
                {
                    type: "category-choice",
                    category: ["QR"],
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "category-choice",
                    category: ["QR"],
                    isCompleted: false,
                    completedCourses: []
                }
            ],
            isCompleted: false,
            completedNum: 1
        },
        {
            description: "Writing",
            requiredNum: 2,
            courseItems: [
                {
                    type: "category-choice",
                    category: ["WR"],
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "category-choice",
                    category: ["WR"],
                    isCompleted: false,
                    completedCourses: []
                }
            ],
            isCompleted: false,
            completedNum: 1
        },
        {
            description: "Language (L1)",
            requiredNum: 3,
            courseItems: [
                {
                    type: "designation-choice",
                    category: ["L1"],
                    subjectCodes: ["CHNS"],
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "designation-choice",
                    category: ["L2"],
                    subjectCodes: ["CHNS"],
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "designation-choice",
                    category: ["L3"],
                    subjectCodes: ["CHNS"],
                    isCompleted: false,
                    completedCourses: []
                }
            ],
            isCompleted: false,
            completedNum: 0
        }
    ],
    info: {
        name: "",
	    abbr: "",
	    degreeType: "",
	    stats: {
            courses: -1,
	rating: -1,
	workload: -1,
    	type: "",
        },
	    students: -1,
	    about: "",
	    dus: {
            name: [""],
	email: [""],
        },
	    catalogLink: "",
	    websiteLink: "",
	    majorEmail: ""
    }
};


export const cs_requirements_bs_progress: MajorProgress = {
    name: "Computer Science B.S.",
    totalCourses: 12,
    totalRequirementGroups: 3,
    totalCompletedCourses: 0,
    totalCompletedRequirementGroups: 0,
    requirements: [ // Changed from requirementsProgress to requirements
        {
            description: "Core Requirements",
            requiredNum: 5, // Need all 5 core courses
            courseItems: [
                {
                    type: "multi-choice",
                    courseCodes: ["CPSC 2010"], // Single option, but using multi-choice structure
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "multi-choice",
                    courseCodes: ["CPSC 2020"],
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "multi-choice",
                    courseCodes: ["CPSC 2230"],
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "multi-choice",
                    courseCodes: ["CPSC 3230"],
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "multi-choice",
                    courseCodes: ["CPSC 3650"],
                    isCompleted: false,
                    completedCourses: []
                }
            ],
            isCompleted: false,
            completedNum: 0
        },
        {
            description: "Electives",
            requiredNum: 6, // Need 6 elective courses
            courseItems: [
                {
                    type: "level-choice",
                    subjectCode: ["CPSC"],
                    level: 3000,
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "level-choice",
                    subjectCode: ["CPSC"],
                    level: 3000,
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "level-choice",
                    subjectCode: ["CPSC"],
                    level: 3000,
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "level-choice",
                    subjectCode: ["CPSC"],
                    level: 3000,
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "level-choice",
                    subjectCode: ["CPSC"],
                    level: 3000,
                    isCompleted: false,
                    completedCourses: []
                },
                {
                    type: "level-choice",
                    subjectCode: ["CPSC"],
                    level: 3000,
                    isCompleted: false,
                    completedCourses: []
                }
            ],
            isCompleted: false,
            completedNum: 0
        },
        {
            description: "Senior Project",
            requiredNum: 1, // Need 1 senior project
            courseItems: [
                {
                    type: "multi-choice",
                    courseCodes: ["CPSC 4900"],
                    isCompleted: false,
                    completedCourses: []
                }
            ],
            isCompleted: false,
            completedNum: 0
        }
    ]
};

export const cs_requirements_ba_progress: MajorProgress = {
    name: "Computer Science B.A.",
    totalCourses: 10,
    totalRequirementGroups: 3,
    totalCompletedCourses: 0, 
    totalCompletedRequirementGroups: 0,
    requirementsProgress: [
        {
           type: "course-requirement", 
            description: "Core Requirements",
            courses: [
                {type: "single", courses: [CPSC_2010]},
                {type: "single", courses: [CPSC_2020]},
                {type: "single", courses: [CPSC_2230]},
                {type: "single", courses: [CPSC_3230]},
                {type: "single", courses: [CPSC_3650]}
            ],
            completedCourses: [null, null, null, null, null],
            isFinished: false
        },
        {
            type: "elective-requirement", 
            description: "Electives", 
            subjectCodes: ["CPSC"], 
            minLevel: 3000, 
            requiredNum: 4,
            completedCourses: [null, null, null, null],
            isFinished: false
        },  
         {
            type: "course-requirement", 
            description: "Senior Project", 
            courses: [
                {type: "single", courses: [CPSC_4900]}
            ],
            completedCourses: [null],
            isFinished: false
        }  
    ]
}
