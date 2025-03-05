import { Course } from "@/app/types/course";

export const courseService={
    async getAllCourse():Promise<Course[]>{
        const response = await fetch("/api/py/course/findclass");
        return response.json();
    },
};