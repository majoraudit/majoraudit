import {type Course} from "../types/type-user";

export async function loadCourses(json_file : string)
{
    try {
        console.log(`Loading courses from ${json_file}...`);
        const response = await fetch(json_file);

        if (!response.ok)
            throw new Error(`File not found: ${json_file}`);
        
        const courses = await response.json();

        const normalizedCourses = courses.map((course: any) => ({
           ...course,
           dist: course.dist || [] // Set to empty array if missing
       }));

        console.log(`Succesfully loaded ${courses.length} courses`)
        return normalizedCourses;

    } catch (error) {
        console.error('Error loading courses:', error);
        return [];
    }
}

export class CourseDatabase {
    private courses = new Map<number, Course>();

    normalizeCodes(rawCodes: { department: string; number: string }[]): string[] {
        if(rawCodes.length === 0) return [""];
        
        return rawCodes.map(c => `${c.department} ${c.number}`);
    }

    // maybe change to make same codes --> same courses
    constructor(coursesArray: any[])
    {
        coursesArray.forEach(course => {
            const newCourse: Course = {
                id: course.external_id,
                codes: this.normalizeCodes(course.course_codes),
                title: course.title,
                credit: course.credits,
                dist: course.distributionals || [],
                tags: course.tags || []
                //seasons: course.seasons || [],
                //season_codes: course.season_codes || []
            };

            this.courses.set(course.external_id, newCourse);
        })
    }

    getCourse(code : number): Course | undefined {
        return this.courses.get(code);
    }

    getAllCourses(): Course[]
    {
        return this.courses.size === 0 ? [] : Array.from(this.courses.values());
    }

    getCourses(codes : number[]): Course[] {
        return codes.map(code => this.getCourse(code)).filter(Boolean) as Course[];
    }

    findBySubject(subject: string, minLevel?: number): Course[] {
		return Array.from(this.courses.values()).filter(course => {
			const matchesSubject = course.codes.some(code => code.startsWith(subject));
			if (!matchesSubject) return false;
			
			if (minLevel) {
				const courseNumber = course.codes[0].split(' ')[1];
				const level = parseInt(courseNumber);
				return level >= minLevel;
			}
			return true;
		});
	}
	
	findByCategory(category: string): Course[] {
		return Array.from(this.courses.values()).filter(course => 
			course.dist?.includes(category)
		);
	}
}