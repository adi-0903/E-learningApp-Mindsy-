import { create } from 'zustand';
import { jitsiMeetService, JitsiMeetConfig, JitsiMeetInfo } from '@/services/videoStreamingService';

interface VideoStreamState {
  isActive: boolean;
  currentRoom: string | null;
  meetingInfo: JitsiMeetInfo | null;
  isLoading: boolean;
  error: string | null;

  // Jitsi operations
  openMeeting: (config: JitsiMeetConfig) => Promise<void>;
  getMeetingWebViewUrl: (config: JitsiMeetConfig) => string;
  leaveMeeting: () => void;

  // State setters
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useVideoStreamStore = create<VideoStreamState>((set) => ({
  isActive: false,
  currentRoom: null,
  meetingInfo: null,
  isLoading: false,
  error: null,

  openMeeting: async (config: JitsiMeetConfig) => {
    set({ isLoading: true, error: null });
    try {
      const meetingInfo = jitsiMeetService.getMeetingInfo(config);
      await jitsiMeetService.openInBrowser(config);
      set({
        isActive: true,
        currentRoom: config.roomName,
        meetingInfo,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open meeting';
      set({ error: errorMessage });
      console.error('Error opening Jitsi meeting:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  getMeetingWebViewUrl: (config: JitsiMeetConfig) => {
    return jitsiMeetService.getWebViewUrl(config);
  },

  leaveMeeting: () => {
    jitsiMeetService.leave();
    set({
      isActive: false,
      currentRoom: null,
      meetingInfo: null,
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
