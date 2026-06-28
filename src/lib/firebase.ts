import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInAnonymously
} from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfigDefault from '../../firebase-applet-config.json';

const env = (import.meta as any).env || {};

function isValidFirestoreDbId(id: string | undefined | null): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return trimmed.length > 0 && trimmed !== '(default)';
}

const envFirestoreDbId = env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
const defaultFirestoreDbId = (firebaseConfigDefault as any).firestore?.databaseId || (firebaseConfigDefault as any).firestoreDatabaseId;

const chosenDatabaseId = isValidFirestoreDbId(envFirestoreDbId)
  ? envFirestoreDbId
  : (isValidFirestoreDbId(defaultFirestoreDbId) ? defaultFirestoreDbId : undefined);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigDefault.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigDefault.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigDefault.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigDefault.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigDefault.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigDefault.appId,
  firestoreDatabaseId: chosenDatabaseId,
};

const app = initializeApp(firebaseConfig);

const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

export const db = databaseId 
  ? getFirestore(app, databaseId)
  : getFirestore(app);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore offline persistence failed-precondition: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
      console.warn("Firestore offline persistence unimplemented: Browser does not support it.");
    } else {
      console.warn("Firestore offline persistence error:", err);
    }
  });
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => auth.signOut();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInAnonymously
};
