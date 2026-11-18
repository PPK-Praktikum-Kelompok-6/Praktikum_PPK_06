import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyBIEaal8mXM8fg1UQ8o6twVYGGhETufgKw',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'ppk-praktikum-3ade8.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'ppk-praktikum-3ade8',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'ppk-praktikum-3ade8.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '503940744413',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    '1:503940744413:web:f8d832b8d37d28eb608734',
  measurementId:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-FCTWYJM98L',
};

/**
 * Bernilai true apabila kredensial Firebase nyata sudah dikonfigurasi.
 */
export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes('DemoKey')
);

export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
