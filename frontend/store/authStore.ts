import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { authApi, setTokens, clearTokens, getTokens, setOnAuthFailure } from '@/services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  bio?: string;
  phoneNumber?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
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
  updateProfile: (name: string, bio: string, phoneNumber?: string, profileImageUri?: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string, newPasswordConfirm: string) => Promise<void>;
  updateFCMToken: (fcmToken: string) => Promise<void>;
  requestPhoneOTP: (phoneNumber?: string) => Promise<any>;
  verifyPhoneOTP: (otpCode: string, phoneNumber?: string) => Promise<any>;
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
        phoneNumber: data.user?.phone_number || data.user?.phoneNumber || '',
        isEmailVerified: data.user?.is_email_verified || false,
        isPhoneVerified: data.user?.is_phone_verified || false,
        profileImage: data.user?.profile_image_url || data.user?.profile_image || '',
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
    set({ isLoading: true });
    try {
      // 1. Check if we have tokens at all
      const tokens = await getTokens();
      if (!tokens?.access) {
        await clearTokens();
        await AsyncStorage.removeItem('currentUser');
        set({ user: null, isLoggedIn: false, isLoading: false });
        return null;
      }

      // 2. Try to restore user from cache (for immediate UI responsiveness if needed)
      const cached = await AsyncStorage.getItem('currentUser');
      let cachedUser: User | null = null;
      if (cached) {
        cachedUser = JSON.parse(cached) as User;
        // Optional: Set temporary state if you want to avoid flickering
        // set({ user: cachedUser, isLoggedIn: true });
      }

      // 3. MUST validate with backend to ensure session is still valid
      try {
        const { data } = await authApi.getProfile();
        const actualData = data.data || data; // Handle both direct and wrapped data
        const freshUser: User = {
          id: String(actualData.id),
          email: actualData.email,
          name: actualData.name || actualData.first_name || (cachedUser?.name || ''),
          role: actualData.role || (cachedUser?.role || 'student'),
          bio: actualData.bio || '',
          phoneNumber: actualData.phone_number || actualData.phoneNumber || (cachedUser?.phoneNumber || ''),
          isEmailVerified: actualData.is_email_verified || false,
          isPhoneVerified: actualData.is_phone_verified || false,
          profileImage: actualData.profile_image_url || actualData.profile_image || '',
        };
        set({ user: freshUser, isLoggedIn: true, isLoading: false });
        await AsyncStorage.setItem('currentUser', JSON.stringify(freshUser));
        return freshUser;
      } catch (error) {
        console.error('Session validation failed:', error);
        // Token is invalid and refresh failed (apiRequest already tried refreshing)
        await clearTokens();
        await AsyncStorage.removeItem('currentUser');
        set({ user: null, isLoggedIn: false, isLoading: false });
        return null;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      set({ user: null, isLoggedIn: false, isLoading: false });
      return null;
    }
  },

  updateProfile: async (name: string, bio: string, phoneNumber?: string, profileImageUri?: string) => {
    set({ isLoading: true });
    try {
      const state = useAuthStore.getState();
      if (!state.user) throw new Error('No user logged in');

      const formData = new FormData();
      formData.append('name', name);
      formData.append('bio', bio);
      if (phoneNumber) formData.append('phone_number', phoneNumber);

      if (profileImageUri) {
        // Direct stream of the cryptographic avatar to Cloudinary vault
        formData.append('profile_image', {
          uri: profileImageUri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        } as any);
      }

      console.log('Dispatching secure profile update payload...');
      const { data } = await authApi.updateProfile(formData, true);

      const actualData = data.data || data;
      const updatedUser: User = {
        ...state.user,
        name: actualData.name || actualData.first_name || name,
        bio: actualData.bio || bio,
        phoneNumber: actualData.phone_number || phoneNumber || (state.user?.phoneNumber || ''),
        isEmailVerified: actualData.is_email_verified ?? (state.user?.isEmailVerified || false),
        isPhoneVerified: actualData.is_phone_verified ?? (state.user?.isPhoneVerified || false),
        profileImage: actualData.profile_image_url || actualData.profile_image || (state.user?.profileImage || ''),
      };
      set({ user: updatedUser });
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
    } catch (error) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  changePassword: async (oldPassword: string, newPassword: string, newPasswordConfirm: string) => {
    await authApi.changePassword({
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm
    });
  },

  updateFCMToken: async (fcmToken: string) => {
    await authApi.updateFCMToken(fcmToken);
  },

  requestPhoneOTP: async (phoneNumber?: string) => {
    const { data } = await authApi.requestPhoneOTP(phoneNumber);
    return data;
  },

  verifyPhoneOTP: async (otpCode: string, phoneNumber?: string) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.verifyPhoneOTP(otpCode, phoneNumber);
      const user = useAuthStore.getState().user;
      if (user && data.data) {
        const updatedUser: User = {
          ...user,
          phoneNumber: data.data.phone_number || phoneNumber || user.phoneNumber,
          isPhoneVerified: data.data.is_phone_verified,
        };
        set({ user: updatedUser });
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
      return data;
    } finally {
      set({ isLoading: false });
    }
  },
}));

// ─── Global Auth Error Listener ──────────────────────────────────
// Automatically log out when the API service detects an expired/invalid session
setOnAuthFailure(() => {
  useAuthStore.setState({ user: null, isLoggedIn: false });
  AsyncStorage.removeItem('currentUser');
});
