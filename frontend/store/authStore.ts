import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { authApi, setTokens, clearTokens, getTokens } from '@/services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  bio?: string;
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string, role: 'teacher' | 'student') => Promise<void>;
  signup: (email: string, password: string, name: string, role: 'teacher' | 'student') => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  updateProfile: (name: string, bio: string, profileImageUri?: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  updateFCMToken: (fcmToken: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isLoggedIn: false,

  login: async (email: string, password: string, role: 'teacher' | 'student') => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(email, password);

      // Store JWT tokens
      if (data.tokens) {
        await setTokens(data.tokens);
      } else if (data.access) {
        await setTokens({ access: data.access, refresh: data.refresh });
      }

      const userData: User = {
        id: String(data.user?.id || data.id),
        email: data.user?.email || email,
        name: data.user?.name || data.user?.first_name || '',
        role: data.user?.role || role,
        bio: data.user?.bio || '',
        profileImage: data.user?.profile_image || '',
      };

      // Verify role matches
      if (userData.role !== role) {
        await clearTokens();
        throw new Error(`This account is registered as a ${userData.role}. Please select the correct role.`);
      }

      set({ user: userData, isLoggedIn: true });
      await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
    } catch (error: any) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email: string, password: string, name: string, role: 'teacher' | 'student') => {
    set({ isLoading: true });
    try {
      await authApi.register({
        email,
        password,
        password_confirm: password,
        name,
        role,
      });
      // Don't auto-login after signup — user must login manually
    } catch (error: any) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      const tokens = await getTokens();
      if (tokens?.refresh) {
        await authApi.logout(tokens.refresh).catch(() => { });
      }
    } catch {
      // Ignore logout API errors
    } finally {
      await clearTokens();
      set({ user: null, isLoggedIn: false });
      await AsyncStorage.removeItem('currentUser');
    }
  },

  getCurrentUser: async () => {
    try {
      // First try to restore from AsyncStorage
      const cached = await AsyncStorage.getItem('currentUser');
      if (cached) {
        const user = JSON.parse(cached) as User;
        set({ user, isLoggedIn: true });

        // Validate token is still good by fetching profile
        const tokens = await getTokens();
        if (tokens?.access) {
          try {
            const { data } = await authApi.getProfile();
            const freshUser: User = {
              id: String(data.id),
              email: data.email,
              name: data.name || data.first_name || user.name,
              role: data.role || user.role,
              bio: data.bio || '',
              profileImage: data.profile_image || '',
            };
            set({ user: freshUser, isLoggedIn: true });
            await AsyncStorage.setItem('currentUser', JSON.stringify(freshUser));
            return freshUser;
          } catch {
            // Token expired and refresh failed
            await clearTokens();
            set({ user: null, isLoggedIn: false });
            await AsyncStorage.removeItem('currentUser');
            return null;
          }
        }
        return user;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  updateProfile: async (name: string, bio: string, profileImageUri?: string) => {
    set({ isLoading: true });
    try {
      const state = useAuthStore.getState();
      if (!state.user) throw new Error('No user logged in');

      let profileImage = state.user.profileImage;

      // If a new image URI is provided, upload it via media API
      if (profileImageUri) {
        const { mediaApi } = await import('@/services/api');
        const formData = new FormData();
        formData.append('file', {
          uri: profileImageUri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        } as any);
        formData.append('category', 'profile');
        const { data } = await mediaApi.upload(formData);
        profileImage = data.url || data.file_url;
      }

      const { data } = await authApi.updateProfile({ name, bio, profile_image: profileImage });

      const updatedUser: User = {
        ...state.user,
        name: data.name || name,
        bio: data.bio || bio,
        profileImage: data.profile_image || profileImage,
      };
      set({ user: updatedUser });
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
    } catch (error) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    await authApi.changePassword({ old_password: oldPassword, new_password: newPassword });
  },

  updateFCMToken: async (fcmToken: string) => {
    await authApi.updateFCMToken(fcmToken);
  },
}));
