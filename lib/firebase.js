import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const envApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const validEnvApiKey =
  envApiKey &&
  envApiKey !== 'your-api-key-here' &&
  envApiKey !== 'undefined' &&
  !envApiKey.includes('placeholder')
    ? envApiKey
    : null;

const firebaseConfig = {
  apiKey: validEnvApiKey || 'AIzaSyDOx8cATeUSWtskuoa83suMN1ewGb-vK9I',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'taskflow-381d3.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'taskflow-381d3',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'taskflow-381d3.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '681533181649',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:681533181649:web:29e76f780bd3abaf943ff0',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-F00PK9YSS1',
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (err) {
  app = null;
  auth = null;
  db = null;
  googleProvider = null;
}

export { app, auth, db, googleProvider, firebaseConfig };
export default app;
