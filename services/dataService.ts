import { db, ensureAnonLogin, now } from "./firebase";
import {
  doc, setDoc, getDoc, updateDoc,
  collection, addDoc, getDocs, query, where, increment,
  runTransaction
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

  // deterministic doc id so one document per (user,booth)
  const visitDocId = `${id}::${visit.boothId}`;
  const visitRef = doc(db, "visits", visitDocId);
  const boothRef = doc(db, "booths", visit.boothId);

  await runTransaction(db, async (tx) => {
    const visitSnap = await tx.get(visitRef);
    if (visitSnap.exists()) {
      // existing -> update feedback/rating/timestamp, do NOT increment booth counter
      tx.update(visitRef, {
        rating: visit.rating,
        feedback: visit.feedback,
        timestamp: now(),
      });
    } else {
      // first visit -> create visit doc AND increment booth counter
      tx.set(visitRef, {
        userId: id,
        fullName: user.name,
        divisionCode: user.division,
        boothId: visit.boothId,
        rating: visit.rating,
        feedback: visit.feedback,
        timestamp: now(),
      });
      // create or merge booth doc, increment countersafe for concurrency
      tx.set(boothRef, { visitCount: increment(1) }, { merge: true });
    }
  });

  // return a Visit object for client usage (timestamp here is client now; server timestamp lives in Firestore)
  return {
    userName: user.name,
    division: user.division,
    boothId: visit.boothId,
    rating: visit.rating,
    feedback: visit.feedback,
    timestamp: Date.now(),
  };
};