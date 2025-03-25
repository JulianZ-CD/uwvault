import { Course } from "@/app/types/course";
import { api } from "./api";

export const courseService = {
    async getAllCourse(): Promise<Course[]> {
        const response = await api.get("/course");
        return response.data;
    },

    async getCourseById(id: string): Promise<Course> {
        const response = await api.get(`/course/${id}`);
        return response.data;
    },

    async createCourse(data: Partial<Course>): Promise<Course> {
        const response = await api.post("/course", data);
        return response.data;
    },

    async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
        const response = await api.put(`/course/${id}`, data);
        return response.data;
    },

    async deleteCourse(id: string): Promise<void> {
        await api.delete(`/course/${id}`);
    },
};