import { create } from 'zustand';
import { quizApi } from '@/services/api';

export interface Quiz {
  id: string;
  courseId?: string | number;
  course?: number | string;
  title: string;
  description?: string;
  totalQuestions: number;
  passingScore: number;
  timeLimit?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizQuestion {
  id: string;
  quizId?: string | number;
  quiz?: number | string;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string;
  correctAnswer: string;
  sequenceNumber: number;
  createdAt?: string;
}

export interface QuizAttempt {
  id: string;
  studentId?: string;
  quizId?: string | number;
  quiz?: number | string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  attemptedAt?: string;
  timeSpent?: number;
}

function normalizeQuiz(raw: any): Quiz {
  return {
    id: String(raw.id),
    courseId: raw.course_id || raw.courseId || (raw.course ? String(raw.course) : undefined),
    title: raw.title,
    description: raw.description || '',
    totalQuestions: raw.total_questions || raw.totalQuestions || 0,
    passingScore: raw.passing_score || raw.passingScore || 0,
    timeLimit: raw.time_limit || raw.timeLimit,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

function normalizeQuestion(raw: any): QuizQuestion {
  return {
    id: String(raw.id),
    quizId: raw.quiz_id || raw.quizId || (raw.quiz ? String(raw.quiz) : undefined),
    questionText: raw.question_text || raw.questionText,
    questionType: raw.question_type || raw.questionType,
    options: raw.options || '',
    correctAnswer: raw.correct_answer || raw.correctAnswer || '',
    sequenceNumber: raw.sequence_number || raw.sequenceNumber || 0,
    createdAt: raw.created_at || raw.createdAt,
  };
}

function normalizeAttempt(raw: any): QuizAttempt {
  return {
    id: String(raw.id),
    studentId: raw.student_id || raw.studentId || (raw.student ? String(raw.student) : undefined),
    quizId: raw.quiz_id || raw.quizId || (raw.quiz ? String(raw.quiz) : undefined),
    score: raw.score || 0,
    totalQuestions: raw.total_questions || raw.totalQuestions || 0,
    correctAnswers: raw.correct_answers || raw.correctAnswers || 0,
    attemptedAt: raw.attempted_at || raw.attemptedAt,
    timeSpent: raw.time_spent || raw.timeSpent,
  };
}

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  quizQuestions: QuizQuestion[];
  quizAttempts: QuizAttempt[];
  isLoading: boolean;

  fetchCourseQuizzes: (courseId: string | number) => Promise<void>;
  getQuizById: (quizId: string | number) => Promise<Quiz | null>;
  createQuiz: (quiz: {
    course: string | number;
    title: string;
    description?: string;
    total_questions: number;
    passing_score: number;
    time_limit?: number;
  }) => Promise<void>;
  updateQuiz: (quizId: string | number, updates: Partial<Quiz>) => Promise<void>;
  deleteQuiz: (quizId: string | number) => Promise<void>;

  fetchQuizQuestions: (quizId: string | number) => Promise<void>;
  addQuestion: (quizId: string | number, question: {
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string;
    correct_answer: string;
    sequence_number: number;
  }) => Promise<void>;
  updateQuestion: (questionId: string | number, updates: Partial<QuizQuestion>) => Promise<void>;
  deleteQuestion: (questionId: string | number) => Promise<void>;

  fetchStudentAttempts: (studentId: string, quizId: string | number) => Promise<void>;
  submitQuizAttempt: (quizId: string | number, answers: Record<string, string>) => Promise<void>;
}

export const useQuizStore = create<QuizState>((set) => ({
  quizzes: [],
  currentQuiz: null,
  quizQuestions: [],
  quizAttempts: [],
  isLoading: false,

  fetchCourseQuizzes: async (courseId) => {
    set({ isLoading: true });
    try {
      const { data } = await quizApi.list(courseId);
      const results = data.results || data;
      set({ quizzes: (Array.isArray(results) ? results : []).map(normalizeQuiz) });
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  getQuizById: async (quizId) => {
    try {
      const { data } = await quizApi.get(quizId);
      return normalizeQuiz(data);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      return null;
    }
  },

  createQuiz: async (quiz) => {
    try {
      await quizApi.create(quiz);
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw error;
    }
  },

  updateQuiz: async (quizId, updates) => {
    try {
      await quizApi.update(quizId, {
        title: updates.title,
        description: updates.description,
        total_questions: updates.totalQuestions,
        passing_score: updates.passingScore,
        time_limit: updates.timeLimit,
      });
    } catch (error) {
      console.error('Error updating quiz:', error);
      throw error;
    }
  },

  deleteQuiz: async (quizId) => {
    try {
      await quizApi.delete(quizId);
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  },

  fetchQuizQuestions: async (quizId) => {
    set({ isLoading: true });
    try {
      const { data } = await quizApi.getQuestions(quizId);
      const results = data.results || data;
      set({ quizQuestions: (Array.isArray(results) ? results : []).map(normalizeQuestion) });
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addQuestion: async (quizId, question) => {
    try {
      await quizApi.addQuestion(quizId, question);
    } catch (error) {
      console.error('Error adding question:', error);
      throw error;
    }
  },

  updateQuestion: async (_questionId, _updates) => {
    // Questions are managed via quiz endpoint
    console.log('Question update: use quiz questions endpoint');
  },

  deleteQuestion: async (_questionId) => {
    // Questions are managed via quiz endpoint
    console.log('Question delete: use quiz questions endpoint');
  },

  fetchStudentAttempts: async (_studentId, quizId) => {
    try {
      const { data } = await quizApi.getAttempts(quizId);
      const results = data.results || data;
      set({ quizAttempts: (Array.isArray(results) ? results : []).map(normalizeAttempt) });
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
    }
  },

  submitQuizAttempt: async (quizId, answers) => {
    try {
      await quizApi.submit(quizId, { answers });
    } catch (error) {
      console.error('Error submitting quiz attempt:', error);
      throw error;
    }
  },
}));
