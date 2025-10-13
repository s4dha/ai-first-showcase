import { db, ensureAnonLogin, now } from "./firebase";
import {
  doc, setDoc, getDoc, updateDoc,
  collection, addDoc, getDocs, query, where, increment
} from "firebase/firestore";
import type { Division, User, Visit } from "../types";

const USER_CACHE_KEY = "showcase_user_cache";

// ---------- helpers ----------
function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
function userKey(fullName: string, division: Division) {
  return `${normalize(fullName)}::${normalize(division)}`;
}

// ---------- user ----------
export const loginUser = async (name: string, division: Division): Promise<User> => {
  const uid = await ensureAnonLogin();
  const id = userKey(name, division);
  const uRef = doc(db, "users", id);
  const snap = await getDoc(uRef);

  if (snap.exists()) {
    await updateDoc(uRef, { lastLoginAt: now(), uid });
  } else {
    await setDoc(uRef, {
      fullName: name,
      divisionCode: division,
      uid,
      createdAt: now(),
      lastLoginAt: now(),
    });
  }

  const user: User = { name, division };
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  return user;
};

export const logoutUser = async (): Promise<void> => {
  localStorage.removeItem(USER_CACHE_KEY);
};

export const getCurrentUser = async (): Promise<User | null> => {
  const cached = localStorage.getItem(USER_CACHE_KEY);
  return cached ? JSON.parse(cached) : null;
};

// ---------- visits ----------
export const getAllVisits = async (): Promise<Visit[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const id = userKey(user.name, user.division);

  const q = query(collection(db, "visits"), where("userId", "==", id));
  const snaps = await getDocs(q);

  const out: Visit[] = [];
  snaps.forEach(d => {
    const v = d.data() as any;
    out.push({
      userName: v.fullName,
      division: v.divisionCode,
      boothId: v.boothId,
      rating: v.rating ?? 0,
      feedback: v.feedback ?? "",
      timestamp: v.timestamp?.toMillis ? v.timestamp.toMillis() : Date.now(),
    });
  });
  return out.sort((a,b)=>a.timestamp-b.timestamp);
};



// use your Visit shape directly
export const addVisit = async (
  visit: Omit<Visit, "userName" | "division" | "timestamp">
): Promise<Visit> => {
  const user = await getCurrentUser();
  if (!user) throw new Error("No user is logged in.");
  const id = userKey(user.name, user.division);

  // 1) create visit row (with rating + feedback)
  await addDoc(collection(db, "visits"), {
    userId: id,
    fullName: user.name,
    divisionCode: user.division,
    boothId: visit.boothId,
    rating: visit.rating,
    feedback: visit.feedback,
    timestamp: now(),
  });

  // 2) increment booth live counter
  const boothRef = doc(db, "booths", visit.boothId);
  await setDoc(boothRef, { visitCount: increment(1) }, { merge: true });

  return {
    userName: user.name,
    division: user.division,
    boothId: visit.boothId,
    rating: visit.rating,
    feedback: visit.feedback,
    timestamp: Date.now(),
  };
};

export const getAllVisitsGlobal = async (): Promise<Visit[]> => {
  const snaps = await getDocs(query(collection(db, "visits")));
  const out: Visit[] = [];
  snaps.forEach(d => {
    const v = d.data() as any;
    out.push({
      userName: v.fullName,
      division: v.divisionCode,
      boothId: v.boothId,
      rating: v.rating ?? 0,
      feedback: v.feedback ?? "",
      timestamp: v.timestamp?.toMillis ? v.timestamp.toMillis() : Date.now(),
    });
  });
  return out;
};