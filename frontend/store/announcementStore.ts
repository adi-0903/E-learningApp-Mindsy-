import { create } from 'zustand';
import { announcementApi } from '@/services/api';

export interface Attachment {
  links?: string[];
  pdfs?: { name: string; uri: string }[];
  images?: { name: string; uri: string }[];
}

export interface Announcement {
  id: string;
  courseId?: string | number | null;
  course?: number | string | null;
  teacherId?: string;
  teacher?: number | string;
  title: string;
  content: string;
  attachments?: Attachment;
  createdAt?: string;
  updatedAt?: string;
}

function normalizeAnnouncement(raw: any): Announcement {
  return {
    id: String(raw.id),
    courseId: raw.course_id || raw.courseId || raw.course || null,
    teacherId: raw.teacher_id || raw.teacherId || raw.teacher,
    title: raw.title,
    content: raw.content || '',
    attachments: raw.attachments,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

interface AnnouncementState {
  announcements: Announcement[];
  isLoading: boolean;

  fetchCourseAnnouncements: (courseId: string | number) => Promise<void>;
  fetchSchoolAnnouncements: () => Promise<void>;
  fetchSubjectAnnouncements: () => Promise<void>;
  fetchAllAnnouncements: () => Promise<void>;
  createAnnouncement: (announcement: {
    title: string;
    content: string;
    course?: string | number | null;
    attachments?: Attachment;
  }) => Promise<void>;
  updateAnnouncement: (announcementId: string | number, updates: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (announcementId: string | number) => Promise<void>;
}

export const useAnnouncementStore = create<AnnouncementState>((set) => ({
  announcements: [],
  isLoading: false,

  fetchCourseAnnouncements: async (courseId) => {
    set({ isLoading: true });
    try {
      const { data } = await announcementApi.list();
      const results = data.results || data;
      const all = (Array.isArray(results) ? results : []).map(normalizeAnnouncement);
      set({ announcements: all.filter(a => String(a.courseId) === String(courseId)) });
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSchoolAnnouncements: async () => {
    set({ isLoading: true });
    try {
      const { data } = await announcementApi.list();
      const results = data.results || data;
      const all = (Array.isArray(results) ? results : []).map(normalizeAnnouncement);
      set({ announcements: all.filter(a => !a.courseId) });
    } catch (error) {
      console.error('Error fetching school announcements:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSubjectAnnouncements: async () => {
    set({ isLoading: true });
    try {
      const { data } = await announcementApi.list();
      const results = data.results || data;
      const all = (Array.isArray(results) ? results : []).map(normalizeAnnouncement);
      set({ announcements: all.filter(a => a.courseId) });
    } catch (error) {
      console.error('Error fetching subject announcements:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAllAnnouncements: async () => {
    set({ isLoading: true });
    try {
      const { data } = await announcementApi.list();
      const results = data.results || data;
      set({ announcements: (Array.isArray(results) ? results : []).map(normalizeAnnouncement) });
    } catch (error) {
      console.error('Error fetching all announcements:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createAnnouncement: async (announcement) => {
    try {
      await announcementApi.create(announcement);
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  },

  updateAnnouncement: async (announcementId, updates) => {
    try {
      await announcementApi.update(announcementId, {
        title: updates.title,
        content: updates.content,
      });
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  },

  deleteAnnouncement: async (announcementId) => {
    try {
      await announcementApi.delete(announcementId);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  },
}));
