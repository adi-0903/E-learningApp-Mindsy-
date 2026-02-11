import { create } from 'zustand';
import { enrollmentApi, progressApi, studentApi, teacherApi } from '@/services/api';

export interface LessonProgress {
  id: string;
  studentId?: string;
  lessonId?: string | number;
  lesson?: number | string;
  isCompleted: boolean;
  completedAt?: string;
  timeSpent: number;
}

export interface Enrollment {
  id: string;
  studentId?: string;
  courseId?: string | number;
  course?: number | string;
  enrolledAt?: string;
  completionPercentage: number;
  status: 'active' | 'completed' | 'dropped';
}

interface ProgressState {
  enrollments: Enrollment[];
  lessonProgress: LessonProgress[];
  isLoading: boolean;

  // Enrollment operations
  enrollInCourse: (studentId: string, courseId: string | number) => Promise<void>;
  unenrollFromCourse: (studentId: string, courseId: string | number) => Promise<void>;
  getEnrollment: (studentId: string, courseId: string | number) => Promise<Enrollment | null>;
  fetchStudentEnrollments: (studentId?: string) => Promise<void>;
  updateEnrollmentProgress: (enrollmentId: string, completionPercentage: number) => Promise<void>;

  // Lesson progress operations
  markLessonComplete: (studentId: string, lessonId: string | number) => Promise<void>;
  markLessonIncomplete: (studentId: string, lessonId: string | number) => Promise<void>;
  getLessonProgress: (studentId: string, lessonId: string | number) => Promise<LessonProgress | null>;
  fetchCourseLessonProgress: (studentId: string, courseId: string | number) => Promise<void>;
  updateLessonTimeSpent: (studentId: string, lessonId: string | number, timeSpent: number) => Promise<void>;

  // Analytics
  getCourseProgress: (studentId: string, courseId: string | number) => Promise<number>;

  // Teacher analytics
  fetchTeacherStudentProgress: (teacherId?: string) => Promise<any[]>;
  fetchCourseStudentProgress: (courseId: string | number) => Promise<any[]>;
}

function normalizeEnrollment(raw: any): Enrollment {
  return {
    id: String(raw.id),
    studentId: raw.student_id || raw.studentId || (raw.student ? String(raw.student) : undefined),
    courseId: raw.course_id || raw.courseId || (raw.course ? String(raw.course) : undefined),
    enrolledAt: raw.enrolled_at || raw.enrolledAt,
    completionPercentage: raw.completion_percentage || raw.completionPercentage || 0,
    status: raw.status || 'active',
  };
}

export const useProgressStore = create<ProgressState>((set) => ({
  enrollments: [],
  lessonProgress: [],
  isLoading: false,

  enrollInCourse: async (_studentId: string, courseId: string | number) => {
    try {
      await enrollmentApi.enroll(courseId);
    } catch (error) {
      console.error('Error enrolling in course:', error);
      throw error;
    }
  },

  unenrollFromCourse: async (_studentId: string, courseId: string | number) => {
    try {
      await enrollmentApi.unenroll(courseId);
    } catch (error) {
      console.error('Error unenrolling from course:', error);
      throw error;
    }
  },

  getEnrollment: async (_studentId: string, courseId: string | number) => {
    try {
      const { data } = await enrollmentApi.getStatus(courseId);
      if (data && data.is_enrolled) {
        return normalizeEnrollment(data);
      }
      return null;
    } catch (error) {
      console.error('Error fetching enrollment:', error);
      return null;
    }
  },

  fetchStudentEnrollments: async () => {
    set({ isLoading: true });
    try {
      const { data } = await studentApi.getCourses();
      const results = data.results || data;
      set({
        enrollments: (Array.isArray(results) ? results : []).map(normalizeEnrollment),
      });
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateEnrollmentProgress: async (_enrollmentId: string, _completionPercentage: number) => {
    // Progress is tracked server-side automatically
    console.log('Progress is managed server-side');
  },

  markLessonComplete: async (_studentId: string, lessonId: string | number) => {
    try {
      await progressApi.completeLesson(lessonId);
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      throw error;
    }
  },

  markLessonIncomplete: async (_studentId: string, _lessonId: string | number) => {
    // Backend may not support un-completing; this is a no-op or custom endpoint
    console.log('markLessonIncomplete: not supported by backend');
  },

  getLessonProgress: async (_studentId: string, _lessonId: string | number) => {
    // Individual lesson progress can be derived from course progress
    return null;
  },

  fetchCourseLessonProgress: async (_studentId: string, courseId: string | number) => {
    set({ isLoading: true });
    try {
      const { data } = await progressApi.getCourseProgress(courseId);
      const results = data.lesson_progress || data.results || data;
      set({
        lessonProgress: Array.isArray(results)
          ? results.map((r: any) => ({
            id: String(r.id || r.lesson_id || ''),
            lessonId: String(r.lesson_id || r.lessonId || r.lesson || ''),
            isCompleted: r.is_completed || r.isCompleted || false,
            completedAt: r.completed_at || r.completedAt,
            timeSpent: r.time_spent || r.timeSpent || 0,
          }))
          : [],
      });
    } catch (error) {
      console.error('Error fetching course lesson progress:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateLessonTimeSpent: async (_studentId: string, _lessonId: string | number, _timeSpent: number) => {
    // Time tracking is managed server-side
    console.log('Time tracking is managed server-side');
  },

  getCourseProgress: async (_studentId: string, courseId: string | number) => {
    try {
      const { data } = await progressApi.getCourseProgress(courseId);
      return data.completion_percentage || data.completionPercentage || 0;
    } catch (error) {
      console.error('Error getting course progress:', error);
      return 0;
    }
  },

  fetchTeacherStudentProgress: async () => {
    try {
      const { data } = await teacherApi.getStudents();
      return data.results || data || [];
    } catch (error) {
      console.error('Error fetching teacher student progress:', error);
      return [];
    }
  },

  fetchCourseStudentProgress: async (courseId: string | number) => {
    try {
      const { data } = await teacherApi.getCourseStudents(courseId);
      return data.results || data || [];
    } catch (error) {
      console.error('Error fetching course student progress:', error);
      return [];
    }
  },
}));
