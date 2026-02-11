/**
 * Firebase Configuration (Minimal)
 * 
 * Firebase is now only used for:
 * - Push Notifications (FCM) via expo-notifications
 * 
 * All data operations (courses, quizzes, users, etc.) have been
 * migrated to the Django REST API. See services/api.ts.
 */

import { initializeApp } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHRRB9jGeYTo5lifbv99QXUPfM3OaUPIk",
  authDomain: "e-learning-app-6e241.firebaseapp.com",
  projectId: "e-learning-app-6e241",
  storageBucket: "e-learning-app-6e241.firebasestorage.app",
  messagingSenderId: "252662347174",
  appId: "1:252662347174:web:fd94b2e99968aeb67a0b67",
  measurementId: "G-0KPV5G1PYY"
};

// Initialize Firebase (only for FCM push notifications)
let app: any = null;

try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized (FCM only)');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export default app;
