import { create } from 'zustand';
import { courseApi, lessonApi } from '@/services/api';

export interface Course {
  id: string;
  teacherId?: string;
  teacher_name?: string;
  teacherName?: string;
  title: string;
  description?: string;
  category?: string;
  coverImage?: string;
  cover_image?: string;
  duration?: string;
  level?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lesson {
  id: string;
  courseId?: string;
  course?: number | string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  video_url?: string;
  fileUrl?: string;
  file_url?: string;
  fileType?: string;
  duration?: number;
  sequenceNumber?: number;
  sequence_number?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Normalize API response to frontend format
function normalizeCourse(raw: any): Course {
  return {
    id: String(raw.id),
    teacherId: raw.teacher_id || raw.teacherId || (raw.teacher ? String(raw.teacher) : undefined),
    teacherName: raw.teacher_name || raw.teacherName || '',
    title: raw.title,
    description: raw.description || '',
    category: raw.category || '',
    coverImage: raw.cover_image || raw.coverImage || '',
    duration: raw.duration || '',
    level: raw.level || '',
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

function normalizeLesson(raw: any): Lesson {
  return {
    id: String(raw.id),
    courseId: raw.course_id || raw.courseId || (raw.course ? String(raw.course) : undefined),
    title: raw.title,
    description: raw.description || '',
    content: raw.content || '',
    videoUrl: raw.video_url || raw.videoUrl || '',
    fileUrl: raw.file_url || raw.fileUrl || '',
    fileType: raw.file_type || raw.fileType || '',
    duration: raw.duration || 0,
    sequenceNumber: raw.sequence_number || raw.sequenceNumber || 0,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

interface CourseState {
  courses: Course[];
  lessons: Lesson[];
  currentCourse: Course | null;
  isLoading: boolean;

  // Course operations
  fetchCourses: () => Promise<void>;
  fetchTeacherCourses: (teacherId?: string) => Promise<void>;
  fetchEnrolledCourses: (studentId?: string) => Promise<void>;
  getCourseById: (courseId: string | number) => Promise<Course | null>;
  createCourse: (course: { title: string; description?: string; category?: string; level?: string; duration?: string; coverImageUri?: string; is_published?: boolean }) => Promise<void>;
  updateCourse: (courseId: string | number, updates: Partial<Course> & { coverImageUri?: string }) => Promise<void>;
  deleteCourse: (courseId: string | number) => Promise<void>;

  // Lesson operations
  fetchLessons: (courseId: string | number) => Promise<void>;
  getLessonById: (lessonId: string | number) => Promise<Lesson | null>;
  createLesson: (lesson: { course: string | number; title: string; description?: string; content?: string; video_url?: string; file_url?: string; sequence_number: number }) => Promise<void>;
  updateLesson: (lessonId: string | number, updates: Partial<Lesson>) => Promise<void>;
  deleteLesson: (lessonId: string | number) => Promise<void>;
  reorderLessons: (lessonIds: (string | number)[]) => Promise<void>;
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  lessons: [],
  currentCourse: null,
  isLoading: false,

  fetchCourses: async () => {
    set({ isLoading: true });
    try {
      console.log('fetchCourses - calling courseApi.list()');
      const response = await courseApi.list();
      console.log('fetchCourses - raw response:', JSON.stringify(response, null, 2));
      const { data } = response;
      console.log('fetchCourses - data:', JSON.stringify(data, null, 2));
      const results = data.data || data.results || data;
      console.log('fetchCourses - results:', results);
      set({ courses: (Array.isArray(results) ? results : []).map(normalizeCourse) });
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTeacherCourses: async () => {
    set({ isLoading: true });
    try {
      const { teacherApi } = await import('@/services/api');
      const response = await teacherApi.getCourses();
      console.log('Teacher courses raw response:', JSON.stringify(response, null, 2));
      const { data } = response;
      const results = data.results || data.data || data;
      console.log('Teacher courses results:', results);
      set({ courses: (Array.isArray(results) ? results : []).map(normalizeCourse) });
    } catch (error) {
      console.error('Error fetching teacher courses:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchEnrolledCourses: async () => {
    set({ isLoading: true });
    try {
      const { studentApi } = await import('@/services/api');
      const { data } = await studentApi.getCourses();
      const results = data.results || data;
      set({ courses: (Array.isArray(results) ? results : []).map(normalizeCourse) });
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  getCourseById: async (courseId) => {
    try {
      const { data } = await courseApi.get(courseId);
      return normalizeCourse(data);
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  },

  createCourse: async (course) => {
    try {
      let coverImage = '';

      if (course.coverImageUri) {
        const { mediaApi } = await import('@/services/api');
        const formData = new FormData();
        formData.append('file', {
          uri: course.coverImageUri,
          name: 'cover.jpg',
          type: 'image/jpeg',
        } as any);
        formData.append('category', 'course-cover');
        const { data: mediaData } = await mediaApi.upload(formData);
        coverImage = mediaData.url || mediaData.file_url;
      }

      await courseApi.create({
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        duration: course.duration,
        cover_image: coverImage || undefined,
        is_published: course.is_published ?? true,
      });
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  },

  updateCourse: async (courseId, updates) => {
    try {
      let cover_image = updates.coverImage;

      if (updates.coverImageUri) {
        const { mediaApi } = await import('@/services/api');
        const formData = new FormData();
        formData.append('file', {
          uri: updates.coverImageUri,
          name: 'cover.jpg',
          type: 'image/jpeg',
        } as any);
        formData.append('category', 'course-cover');
        const { data: mediaData } = await mediaApi.upload(formData);
        cover_image = mediaData.url || mediaData.file_url;
      }

      await courseApi.update(courseId, {
        title: updates.title,
        description: updates.description,
        category: updates.category,
        level: updates.level,
        duration: updates.duration,
        cover_image,
      });
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  },

  deleteCourse: async (courseId) => {
    try {
      await courseApi.delete(courseId);
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  },

  fetchLessons: async (courseId) => {
    set({ isLoading: true });
    try {
      const { data } = await lessonApi.list(courseId);
      const results = data.results || data;
      set({ lessons: (Array.isArray(results) ? results : []).map(normalizeLesson) });
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  getLessonById: async (lessonId) => {
    try {
      const { data } = await lessonApi.get(lessonId);
      return normalizeLesson(data);
    } catch (error) {
      console.error('Error fetching lesson:', error);
      return null;
    }
  },

  createLesson: async (lesson) => {
    try {
      await lessonApi.create(lesson);
    } catch (error) {
      console.error('Error creating lesson:', error);
      throw error;
    }
  },

  updateLesson: async (lessonId, updates) => {
    try {
      await lessonApi.update(lessonId, {
        title: updates.title,
        description: updates.description,
        content: updates.content,
        video_url: updates.videoUrl || updates.video_url,
        file_url: updates.fileUrl || updates.file_url,
        sequence_number: updates.sequenceNumber || updates.sequence_number,
      });
    } catch (error) {
      console.error('Error updating lesson:', error);
      throw error;
    }
  },

  deleteLesson: async (lessonId) => {
    try {
      await lessonApi.delete(lessonId);
    } catch (error) {
      console.error('Error deleting lesson:', error);
      throw error;
    }
  },

  reorderLessons: async (lessonIds) => {
    try {
      await lessonApi.reorder({ lesson_ids: lessonIds });
    } catch (error) {
      console.error('Error reordering lessons:', error);
      throw error;
    }
  },
}));
