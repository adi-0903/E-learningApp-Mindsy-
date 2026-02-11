import { create } from 'zustand';
import { liveClassApi } from '@/services/api';

export interface LiveClass {
  id: string;
  courseId?: string | number;
  course?: number | string;
  teacherId?: string;
  teacherName?: string;
  title: string;
  description?: string;
  roomId?: string;
  channelName?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  scheduledStartTime?: string | Date;
  actualStartTime?: string | Date;
  endTime?: string | Date;
  maxParticipants?: number;
  createdAt?: string;
  updatedAt?: string;
  participantCount?: number;
  // Jitsi fields
  jitsiDomain?: string;
  meetingUrl?: string;
  isClassHost?: boolean;
}

export interface LiveClassParticipant {
  id: string;
  classId?: string;
  studentId?: string;
  studentName?: string;
  user?: any;
  joinedAt?: string | Date;
  leftAt?: string | Date;
  status: 'joined' | 'left' | 'idle';
}

function normalizeLiveClass(raw: any): LiveClass {
  return {
    id: String(raw.id),
    courseId: raw.course_id || raw.courseId || (raw.course ? String(raw.course) : undefined),
    teacherId: raw.teacher_id || raw.teacherId || (raw.teacher ? String(raw.teacher) : undefined),
    teacherName: raw.teacher_name || raw.teacherName || '',
    title: raw.title,
    description: raw.description || '',
    roomId: raw.room_id || raw.roomId || raw.channel_name || '',
    channelName: raw.channel_name || raw.channelName || '',
    status: raw.status || 'scheduled',
    scheduledStartTime: raw.scheduled_start_time || raw.scheduledStartTime,
    actualStartTime: raw.actual_start_time || raw.actualStartTime,
    endTime: raw.end_time || raw.endTime,
    maxParticipants: raw.max_participants || raw.maxParticipants,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
    participantCount: raw.participant_count || raw.participantCount || 0,
    jitsiDomain: raw.jitsi_domain || raw.jitsiDomain,
    meetingUrl: raw.meeting_url || raw.meetingUrl,
    isClassHost: raw.is_class_host || raw.isClassHost,
  };
}

interface LiveClassState {
  liveClasses: LiveClass[];
  currentLiveClass: LiveClass | null;
  participants: LiveClassParticipant[];
  isLoading: boolean;
  activeClasses: LiveClass[];

  fetchAllLiveClasses: () => Promise<void>;
  fetchTeacherLiveClasses: (teacherId?: string) => Promise<void>;
  fetchCourseLiveClasses: (courseId?: string | number) => Promise<void>;
  fetchActiveLiveClasses: () => Promise<void>;
  getLiveClassById: (classId: string | number) => Promise<LiveClass | null>;
  createLiveClass: (liveClass: {
    course: string | number;
    title: string;
    description?: string;
    scheduled_start_time: string;
    max_participants?: number;
  }) => Promise<string | number>;
  updateLiveClass: (classId: string | number, updates: Partial<LiveClass>) => Promise<void>;
  deleteLiveClass: (classId: string | number) => Promise<void>;
  startLiveClass: (classId: string | number) => Promise<LiveClass>;
  endLiveClass: (classId: string | number) => Promise<void>;
  joinLiveClass: (classId: string | number) => Promise<LiveClass>;
  leaveLiveClass: (classId: string | number) => Promise<void>;

  fetchParticipants: (classId: string | number) => Promise<void>;

  setCurrentLiveClass: (liveClass: LiveClass | null) => void;
  clearCurrentLiveClass: () => void;
}

export const useLiveClassStore = create<LiveClassState>((set) => ({
  liveClasses: [],
  currentLiveClass: null,
  participants: [],
  isLoading: false,
  activeClasses: [],

  fetchAllLiveClasses: async () => {
    set({ isLoading: true });
    try {
      const { data } = await liveClassApi.list();
      const results = data.results || data;
      set({ liveClasses: (Array.isArray(results) ? results : []).map(normalizeLiveClass) });
    } catch (error) {
      console.error('Error fetching live classes:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTeacherLiveClasses: async () => {
    set({ isLoading: true });
    try {
      const { data } = await liveClassApi.list();
      const results = data.results || data;
      set({ liveClasses: (Array.isArray(results) ? results : []).map(normalizeLiveClass) });
    } catch (error) {
      console.error('Error fetching teacher live classes:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCourseLiveClasses: async (courseId) => {
    set({ isLoading: true });
    try {
      const { data } = await liveClassApi.list();
      const results = data.results || data;
      const all = (Array.isArray(results) ? results : []).map(normalizeLiveClass);
      const filtered = courseId ? all.filter(c => String(c.courseId) === String(courseId)) : all;
      set({ liveClasses: filtered });
    } catch (error) {
      console.error('Error fetching course live classes:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchActiveLiveClasses: async () => {
    set({ isLoading: true });
    try {
      const { data } = await liveClassApi.list();
      const results = data.results || data;
      const all = (Array.isArray(results) ? results : []).map(normalizeLiveClass);
      set({ activeClasses: all.filter(c => c.status === 'active') });
    } catch (error) {
      console.error('Error fetching active live classes:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  getLiveClassById: async (classId) => {
    try {
      const { data } = await liveClassApi.get(classId);
      return normalizeLiveClass(data);
    } catch (error) {
      console.error('Error fetching live class:', error);
      return null;
    }
  },

  createLiveClass: async (liveClass) => {
    try {
      const { data } = await liveClassApi.create(liveClass);
      return data.id;
    } catch (error) {
      console.error('Error creating live class:', error);
      throw error;
    }
  },

  updateLiveClass: async (classId, updates) => {
    try {
      await liveClassApi.update(classId, {
        title: updates.title,
        description: updates.description,
        scheduled_start_time: updates.scheduledStartTime as string,
        max_participants: updates.maxParticipants,
      });
    } catch (error) {
      console.error('Error updating live class:', error);
      throw error;
    }
  },

  deleteLiveClass: async (classId) => {
    try {
      await liveClassApi.delete(classId);
    } catch (error) {
      console.error('Error deleting live class:', error);
      throw error;
    }
  },

  startLiveClass: async (classId) => {
    try {
      const { data } = await liveClassApi.start(classId);
      const liveClassData = normalizeLiveClass({
        ...data.data,
        id: classId,
        status: 'active',
      });
      set({ currentLiveClass: liveClassData });
      return liveClassData;
    } catch (error) {
      console.error('Error starting live class:', error);
      throw error;
    }
  },

  endLiveClass: async (classId) => {
    try {
      await liveClassApi.end(classId);
      set({ currentLiveClass: null });
    } catch (error) {
      console.error('Error ending live class:', error);
      throw error;
    }
  },

  joinLiveClass: async (classId) => {
    try {
      const { data } = await liveClassApi.join(classId);
      const liveClassData = normalizeLiveClass({
        ...data.data,
        id: classId,
        status: 'active',
      });
      set({ currentLiveClass: liveClassData });
      return liveClassData;
    } catch (error) {
      console.error('Error joining live class:', error);
      throw error;
    }
  },

  leaveLiveClass: async (classId) => {
    try {
      await liveClassApi.leave(classId);
      set({ currentLiveClass: null });
    } catch (error) {
      console.error('Error leaving live class:', error);
      throw error;
    }
  },

  fetchParticipants: async (classId) => {
    set({ isLoading: true });
    try {
      const { data } = await liveClassApi.getParticipants(classId);
      const results = data.results || data;
      set({ participants: Array.isArray(results) ? results : [] });
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentLiveClass: (liveClass) => {
    set({ currentLiveClass: liveClass });
  },

  clearCurrentLiveClass: () => {
    set({ currentLiveClass: null });
  },
}));
