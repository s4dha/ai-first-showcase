import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBDKfepHBxBc4U_xw00zodthJZpKvLLQ6s",
    authDomain: "ai-first-showcase-11224.firebaseapp.com",
    projectId: "ai-first-showcase-11224",
    storageBucket: "ai-first-showcase-11224.firebasestorage.app",
    messagingSenderId: "535773419091",
    appId: "1:535773419091:web:b5461cc195ee4c6bce58a6"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const now = serverTimestamp;

export async function ensureAnonLogin(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  await signInAnonymously(auth);
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (u) => { if (u) { unsub(); resolve(u.uid); } },
      reject
    );
  });
}
