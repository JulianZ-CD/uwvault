import { Course } from "@/app/types/course";

export const courseService={
    async getAllCourse():Promise<Course[]>{
        const response = await fetch("/api/py/course/allclass");
        return response.json();
    },
};