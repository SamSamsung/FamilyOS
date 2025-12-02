import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDUzGiP6fCvUYdEhs8eCEjo8bzXR_FYU5c",
  authDomain: "payement-par.firebaseapp.com",
  projectId: "payement-par",
  storageBucket: "payement-par.firebasestorage.app",
  messagingSenderId: "187755197414",
  appId: "1:187755197414:web:ed7d1576d4c205eb9c1c27",
  measurementId: "G-4XSBPF2DXK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();