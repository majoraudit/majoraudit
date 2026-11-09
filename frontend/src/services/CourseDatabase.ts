import {type Course, type CourseOffering} from "../types/type-user";

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
    private coursesByInstance = new Map<number, Course>();

    normalizeCodes(rawCodes: { department: string; number: string }[]): string[] {
        if(rawCodes){
        if(rawCodes.length === 0) return [""];
        
        return rawCodes.map(c => `${c.department} ${c.number}`);
        }

        return [];
    }

    // maybe change to make same codes --> same courses
    constructor(coursesArray: any[])
    {
        coursesArray.forEach(course => {
            const offerings: CourseOffering[] = (course.course_instances ?? []).map((instance: any) => {
                const seasonSuffix = instance.season === "SP" ? "01" : instance.season === "SU" ? "02" : "03";
                return {
                    instanceId: Number(instance.external_id),
                    seasonCode: `${instance.year}${seasonSuffix}`,
                    codes: this.normalizeCodes(instance.course_codes ?? []),
                    professors: (instance.course_professors ?? []).map((professor: any) => professor.name),
                    section: String(instance.section_num ?? ""),
                };
            }).sort((a: CourseOffering, b: CourseOffering) =>
                a.seasonCode.localeCompare(b.seasonCode) ||
                a.section.localeCompare(b.section, undefined, { numeric: true }) ||
                a.instanceId - b.instanceId
            );
            const allCodes = this.normalizeCodes(course.course_codes);
            const currentCodes = offerings[offerings.length - 1]?.codes ?? [];
            const displayCodes = [
                ...currentCodes,
                ...allCodes.filter((code) => !currentCodes.includes(code)),
            ];
            const newCourse: Course = {
                id: course.external_id,
                codes: displayCodes,
                title: course.title,
                credit: course.credits,
                dist: course.distributionals || [],
                tags: (course.course_tags ?? []).map((tag: any) => tag.name ?? tag),
                offerings,
                season_codes: offerings.map((offering) => offering.seasonCode),
            };

            this.courses.set(course.external_id, newCourse);
            offerings.forEach((offering) => {
                this.coursesByInstance.set(offering.instanceId, this.withOffering(newCourse, offering));
            });
        })
    }

    private withOffering(course: Course, offering: CourseOffering): Course {
        return {
            ...course,
            codes: offering.codes.length > 0 ? offering.codes : course.codes,
            instanceId: offering.instanceId,
            seasonCode: offering.seasonCode,
            professors: offering.professors,
        };
    }

    getCourseForTerm(courseId: number, seasonCode: number | string): Course | undefined {
        const course = this.courses.get(courseId);
        if (!course) return undefined;
        const offering = course.offerings?.find((item) => item.seasonCode === String(seasonCode));
        return offering ? this.withOffering(course, offering) : undefined;
    }

    getCourseByInstance(instanceId: number): Course | undefined {
        return this.coursesByInstance.get(instanceId);
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
