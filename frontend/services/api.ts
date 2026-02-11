/**
 * Central API Service
 * Handles all communication with the Django REST backend.
 * Uses JWT authentication with automatic token refresh.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuration ───────────────────────────────────────────────
// IMPORTANT: For physical Android devices, replace with your computer's IP address
// Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
// Example: 'http://192.168.1.100:8000/api'
const API_BASE_URL = __DEV__
  ? 'http://192.168.137.1:8000/api'  // Your computer's IP
  : 'https://your-production-url.com/api';

// For Android Emulator use: 'http://10.0.2.2:8000/api'
// For iOS Simulator use: 'http://localhost:8000/api'

const TOKEN_KEY = 'auth_tokens';

interface AuthTokens {
  access: string;
  refresh: string;
}

// ─── Token Management ────────────────────────────────────────────
let cachedTokens: AuthTokens | null = null;

async function getTokens(): Promise<AuthTokens | null> {
  if (cachedTokens) return cachedTokens;
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    if (raw) {
      cachedTokens = JSON.parse(raw);
      return cachedTokens;
    }
  } catch (e) {
    console.error('Error reading tokens:', e);
  }
  return null;
}

async function setTokens(tokens: AuthTokens): Promise<void> {
  cachedTokens = tokens;
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

async function clearTokens(): Promise<void> {
  cachedTokens = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ─── Core Request Function ───────────────────────────────────────
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean;
  skipAuth?: boolean;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens?.refresh) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/v1/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });

    if (res.ok) {
      const data = await res.json();
      const newTokens: AuthTokens = {
        access: data.access,
        refresh: tokens.refresh,
      };
      await setTokens(newTokens);
      return data.access;
    }
  } catch (e) {
    console.error('Token refresh failed:', e);
  }

  // Refresh failed — force logout
  await clearTokens();
  return null;
}

async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, isFormData = false, skipAuth = false } = options;

  // Build headers
  const reqHeaders: Record<string, string> = { ...headers };
  if (!isFormData) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const tokens = await getTokens();
    if (tokens?.access) {
      reqHeaders['Authorization'] = `Bearer ${tokens.access}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const fetchOptions: RequestInit = {
    method,
    headers: reqHeaders,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = isFormData ? body : JSON.stringify(body);
  }

  let res = await fetch(url, fetchOptions);

  // If 401, attempt refresh and retry once
  if (res.status === 401 && !skipAuth) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      reqHeaders['Authorization'] = `Bearer ${newAccessToken}`;
      fetchOptions.headers = reqHeaders;
      res = await fetch(url, fetchOptions);
    }
  }

  let data: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  }

  if (!res.ok) {
    const errorMessage =
      data?.error?.message ||
      data?.detail ||
      data?.message ||
      (typeof data === 'object' ? JSON.stringify(data) : `Request failed with status ${res.status}`);
    throw new Error(errorMessage);
  }

  return { data, status: res.status, ok: res.ok };
}

// ─── Helper shortcuts ────────────────────────────────────────────
const api = {
  get: <T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  upload: <T = any>(endpoint: string, formData: FormData, options?: Omit<RequestOptions, 'method' | 'body' | 'isFormData'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body: formData, isFormData: true }),
};

// ═══════════════════════════════════════════════════════════════════
// API ENDPOINT METHODS — organized by domain
// ═══════════════════════════════════════════════════════════════════

// ─── Health ──────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health/', { skipAuth: true }),
};

// ─── Auth ────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/v1/auth/login/', { email, password }, { skipAuth: true }),

  register: (data: { email: string; password: string; password_confirm: string; name: string; role: 'teacher' | 'student' }) =>
    api.post('/v1/auth/register/', data, { skipAuth: true }),

  logout: (refreshToken: string) =>
    api.post('/v1/auth/logout/', { refresh: refreshToken }),

  refreshToken: (refreshToken: string) =>
    api.post('/v1/auth/token/refresh/', { refresh: refreshToken }, { skipAuth: true }),

  getProfile: () =>
    api.get('/v1/auth/profile/'),

  updateProfile: (data: { name?: string; bio?: string; profile_image?: string }) =>
    api.put('/v1/auth/profile/', data),

  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/v1/auth/change-password/', data),

  updateFCMToken: (fcmToken: string) =>
    api.post('/v1/auth/fcm-token/', { fcm_token: fcmToken }),
};

// ─── Students ────────────────────────────────────────────────────
export const studentApi = {
  getDashboard: () =>
    api.get('/v1/students/dashboard/'),

  getCourses: () =>
    api.get('/v1/students/courses/'),

  browseCourses: () =>
    api.get('/v1/students/browse/'),

  getProgress: () =>
    api.get('/v1/students/progress/'),

  getQuizHistory: () =>
    api.get('/v1/students/quiz-history/'),
};

// ─── Teachers ────────────────────────────────────────────────────
export const teacherApi = {
  getDashboard: () =>
    api.get('/v1/teachers/dashboard/'),

  getCourses: () =>
    api.get('/v1/teachers/courses/'),

  getStudents: () =>
    api.get('/v1/teachers/students/'),

  getCourseStudents: (courseId: string | number) =>
    api.get(`/v1/teachers/courses/${courseId}/students/`),
};

// ─── Courses ─────────────────────────────────────────────────────
export const courseApi = {
  list: () =>
    api.get('/v1/courses/'),

  get: (id: string | number) =>
    api.get(`/v1/courses/${id}/`),

  create: (data: {
    title: string;
    description?: string;
    category?: string;
    level?: string;
    duration?: string;
    cover_image?: string;
    is_published?: boolean;
  }) => api.post('/v1/courses/', data),

  update: (id: string | number, data: Partial<{
    title: string;
    description: string;
    category: string;
    level: string;
    duration: string;
    cover_image: string;
  }>) => api.put(`/v1/courses/${id}/`, data),

  delete: (id: string | number) =>
    api.delete(`/v1/courses/${id}/`),
};

// ─── Lessons ─────────────────────────────────────────────────────
export const lessonApi = {
  list: (courseId?: string | number) => {
    const query = courseId ? `?course_id=${courseId}` : '';
    return api.get(`/v1/lessons/${query}`);
  },

  get: (id: string | number) =>
    api.get(`/v1/lessons/${id}/`),

  create: (data: {
    course: string | number;
    title: string;
    description?: string;
    content?: string;
    video_url?: string;
    file_url?: string;
    sequence_number: number;
  }) => api.post('/v1/lessons/', data),

  update: (id: string | number, data: Partial<{
    title: string;
    description: string;
    content: string;
    video_url: string;
    file_url: string;
    sequence_number: number;
  }>) => api.put(`/v1/lessons/${id}/`, data),

  delete: (id: string | number) =>
    api.delete(`/v1/lessons/${id}/`),

  reorder: (data: { lesson_ids: (string | number)[] }) =>
    api.post('/v1/lessons/reorder/', data),
};

// ─── Quizzes ─────────────────────────────────────────────────────
export const quizApi = {
  list: (courseId?: string | number) => {
    const query = courseId ? `?course_id=${courseId}` : '';
    return api.get(`/v1/quizzes/${query}`);
  },

  get: (id: string | number) =>
    api.get(`/v1/quizzes/${id}/`),

  create: (data: {
    course: string | number;
    title: string;
    description?: string;
    total_questions: number;
    passing_score: number;
    time_limit?: number;
  }) => api.post('/v1/quizzes/', data),

  update: (id: string | number, data: Partial<{
    title: string;
    description: string;
    total_questions: number;
    passing_score: number;
    time_limit: number;
  }>) => api.put(`/v1/quizzes/${id}/`, data),

  delete: (id: string | number) =>
    api.delete(`/v1/quizzes/${id}/`),

  // Questions
  getQuestions: (quizId: string | number) =>
    api.get(`/v1/quizzes/${quizId}/questions/`),

  addQuestion: (quizId: string | number, data: {
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string;
    correct_answer: string;
    sequence_number: number;
  }) => api.post(`/v1/quizzes/${quizId}/questions/`, data),

  // Submit & Attempts
  submit: (quizId: string | number, data: { answers: Record<string, string> }) =>
    api.post(`/v1/quizzes/${quizId}/submit/`, data),

  getAttempts: (quizId: string | number) =>
    api.get(`/v1/quizzes/${quizId}/attempts/`),
};

// ─── Enrollments ─────────────────────────────────────────────────
export const enrollmentApi = {
  enroll: (courseId: string | number) =>
    api.post('/v1/enrollments/enroll/', { course_id: courseId }),

  unenroll: (courseId: string | number) =>
    api.post('/v1/enrollments/unenroll/', { course_id: courseId }),

  getStatus: (courseId: string | number) =>
    api.get(`/v1/enrollments/status/${courseId}/`),
};

// ─── Progress ────────────────────────────────────────────────────
export const progressApi = {
  completeLesson: (lessonId: string | number) =>
    api.post('/v1/progress/complete/', { lesson_id: lessonId }),

  getCourseProgress: (courseId: string | number) =>
    api.get(`/v1/progress/course/${courseId}/`),
};

// ─── Live Classes ────────────────────────────────────────────────
export const liveClassApi = {
  list: () =>
    api.get('/v1/live-classes/'),

  get: (id: string | number) =>
    api.get(`/v1/live-classes/${id}/`),

  create: (data: {
    course: string | number;
    title: string;
    description?: string;
    scheduled_start_time: string;
    max_participants?: number;
  }) => api.post('/v1/live-classes/', data),

  update: (id: string | number, data: Partial<{
    title: string;
    description: string;
    scheduled_start_time: string;
    max_participants: number;
  }>) => api.put(`/v1/live-classes/${id}/`, data),

  delete: (id: string | number) =>
    api.delete(`/v1/live-classes/${id}/`),

  start: (id: string | number) =>
    api.post(`/v1/live-classes/${id}/start/`),

  end: (id: string | number) =>
    api.post(`/v1/live-classes/${id}/end/`),

  join: (id: string | number) =>
    api.post(`/v1/live-classes/${id}/join/`),

  leave: (id: string | number) =>
    api.post(`/v1/live-classes/${id}/leave/`),

  getParticipants: (id: string | number) =>
    api.get(`/v1/live-classes/${id}/participants/`),

  getChat: (id: string | number) =>
    api.get(`/v1/live-classes/${id}/chat/`),

  sendChat: (id: string | number, message: string) =>
    api.post(`/v1/live-classes/${id}/chat/`, { message }),
};

// ─── Announcements ───────────────────────────────────────────────
export const announcementApi = {
  list: () =>
    api.get('/v1/announcements/'),

  get: (id: string | number) =>
    api.get(`/v1/announcements/${id}/`),

  create: (data: {
    title: string;
    content: string;
    course?: string | number | null;
    attachments?: any;
  }) => api.post('/v1/announcements/', data),

  update: (id: string | number, data: Partial<{
    title: string;
    content: string;
    attachments: any;
  }>) => api.put(`/v1/announcements/${id}/`, data),

  delete: (id: string | number) =>
    api.delete(`/v1/announcements/${id}/`),
};

// ─── Notifications ───────────────────────────────────────────────
export const notificationApi = {
  list: () =>
    api.get('/v1/notifications/'),

  getUnreadCount: () =>
    api.get('/v1/notifications/unread-count/'),

  markAsRead: (id: string | number) =>
    api.post(`/v1/notifications/${id}/read/`),

  markAllAsRead: () =>
    api.post('/v1/notifications/mark-all-read/'),
};

// ─── Payments ────────────────────────────────────────────────────
export const paymentApi = {
  createCheckout: (data: { course_id: string | number }) =>
    api.post('/v1/payments/checkout/', data),

  getHistory: () =>
    api.get('/v1/payments/history/'),
};

// ─── Analytics ───────────────────────────────────────────────────
export const analyticsApi = {
  getPlatformAnalytics: () =>
    api.get('/v1/analytics/platform/'),

  getPlatformHistory: () =>
    api.get('/v1/analytics/platform/history/'),

  getCourseAnalytics: (courseId: string | number) =>
    api.get(`/v1/analytics/course/${courseId}/`),
};

// ─── Media ───────────────────────────────────────────────────────
export const mediaApi = {
  list: () =>
    api.get('/v1/media/'),

  upload: (formData: FormData) =>
    api.upload('/v1/media/upload/', formData),

  delete: (id: string | number) =>
    api.delete(`/v1/media/${id}/`),
};

// ─── Exported utilities ──────────────────────────────────────────
export { setTokens, clearTokens, getTokens, API_BASE_URL };
export default api;
