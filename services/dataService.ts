import { db, ensureAnonLogin, now } from "./firebase";
import {
  doc, setDoc, getDoc, updateDoc,
  collection, getDocs, query, where, increment,
  runTransaction, deleteDoc
} from "firebase/firestore";
import type { Division, User, Visit } from "../types";
import { BOOTH_IDS } from "../constants";

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

// Add this function to your dataService file

export const updateUser = async (oldName: string, oldDivision: Division, newName: string, newDivision: Division): Promise<User> => {
  // Delete old user document
  const oldUserId = userKey(oldName, oldDivision);
  const oldUserRef = doc(db, "users", oldUserId);
  
  // Create new user document
  const newUserId = userKey(newName, newDivision);
  const newUserRef = doc(db, "users", newUserId);
  
  // Get the old user data
  const oldUserSnap = await getDoc(oldUserRef);
  let userData: any = {
    fullName: newName,
    divisionCode: newDivision,
    uid: await ensureAnonLogin(),
    lastLoginAt: now(),
  };
  
  if (oldUserSnap.exists()) {
    const oldData = oldUserSnap.data();
    userData = {
      ...oldData,
      fullName: newName,
      divisionCode: newDivision,
      uid: oldData.uid || (await ensureAnonLogin()),
      lastLoginAt: now(),
    };
  } else {
    userData.createdAt = now();
  }
  
  // Delete old document if name/division changed
  if (oldUserId !== newUserId) {
    await deleteDoc(oldUserRef);
  }
  
  // Save new document
  await setDoc(newUserRef, userData);
  
  // Update user visits document
  const oldVisitRef = doc(db, "userVisits", oldUserId);
  const newVisitRef = doc(db, "userVisits", newUserId);
  
  const visitSnap = await getDoc(oldVisitRef);
  if (visitSnap.exists()) {
    const visitData = visitSnap.data();
    const updatedVisitData = {
      ...visitData,
      userId: newUserId,
      name: newName,
      division: newDivision,
    };
    
    // Delete old and create new if ID changed
    if (oldUserId !== newUserId) {
      await deleteDoc(oldVisitRef);
      await setDoc(newVisitRef, updatedVisitData);
    } else {
      // Just update if same ID
      await updateDoc(oldVisitRef, updatedVisitData);
    }
  }
  
  // Update local storage
  const user: User = { name: newName, division: newDivision };
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  
  return user;
};

// ---------- new visit architecture ----------
export interface BoothVisit {
  rating?: number;
  feedback?: string;
  timestamp?: number;
}

export interface UserVisitsDoc {
  userId: string;
  name: string;
  division: string;
  booths: Record<string, BoothVisit>;
  visitedCount: number;
  prizeWon: boolean;
  updatedAt: number;
}

// Get all visits for current user
export const getUserVisits = async (): Promise<UserVisitsDoc | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const userId = userKey(user.name, user.division);
  const visitRef = doc(db, "userVisits", userId);
  const snap = await getDoc(visitRef);
  
  if (!snap.exists()) {
    // Initialize empty visits doc
    const newDoc: UserVisitsDoc = {
      userId,
      name: user.name,
      division: user.division,
      booths: {},
      visitedCount: 0,
      prizeWon: false,
      updatedAt: Date.now()
    };
    await setDoc(visitRef, newDoc);
    return newDoc;
  }
  
  return snap.data() as UserVisitsDoc;
};

// Add or update a booth visit
export const addVisit = async (
  boothId: string,
  rating: number,
  feedback: string
): Promise<UserVisitsDoc> => {
  const user = await getCurrentUser();
  if (!user) throw new Error("No user is logged in.");
  
  const userId = userKey(user.name, user.division);
  const visitRef = doc(db, "userVisits", userId);
  
  // Verify boothId is valid
  if (!BOOTH_IDS.includes(boothId)) {
    throw new Error("Invalid booth ID");
  }
  
  let result: UserVisitsDoc | undefined;
  
  await runTransaction(db, async (tx) => {
    // Get current user visits doc
    const visitSnap = await tx.get(visitRef);
    let visitDoc: UserVisitsDoc;
    
    if (!visitSnap.exists()) {
      // Initialize new visits doc
      visitDoc = {
        userId,
        name: user.name,
        division: user.division,
        booths: {},
        visitedCount: 0,
        prizeWon: false,
        updatedAt: Date.now()
      };
    } else {
      visitDoc = visitSnap.data() as UserVisitsDoc;
    }
    
    // Check if this is a new booth visit
    const isNewVisit = !visitDoc.booths[boothId];
    
    // Update booth visit details
    visitDoc.booths[boothId] = {
      rating,
      feedback,
      timestamp: Date.now()
    };
    
    // Update visit count if new booth
    if (isNewVisit) {
      visitDoc.visitedCount = Object.keys(visitDoc.booths).filter(boothId => 
        visitDoc.booths[boothId].timestamp !== undefined
      ).length;
      
      // Check for prize eligibility
      visitDoc.prizeWon = visitDoc.visitedCount >= 10;
    }
    
    visitDoc.updatedAt = Date.now();
    
    // Save user visits doc
    tx.set(visitRef, visitDoc);
    
    result = visitDoc;
  });
  
  if (!result) throw new Error("Transaction failed");
  return result;
};

/// helper: normalize Firestore timestamp (number | Timestamp | { seconds, nanoseconds } | undefined) -> number (ms)
function toMillis(ts: any): number {
  if (ts == null) return NaN;
  if (typeof ts === 'number') return ts;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') {
    const seconds = ts.seconds;
    const nanos = typeof ts.nanoseconds === 'number' ? ts.nanoseconds : 0;
    return seconds * 1000 + Math.floor(nanos / 1e6);
  }
  return NaN;
}

// Get all visits globally (for leaderboard)
export const getAllVisitsGlobal = async (): Promise<Visit[]> => {
  const visits: Visit[] = [];

  // Get all user visits documents
  const userVisitsSnap = await getDocs(collection(db, "userVisits"));

  // For each user visit document, extract booth visits
  userVisitsSnap.forEach((userDoc) => {
    const userData = userDoc.data() as any; // narrow to any for runtime checks
    if (!userData) return;

    const booths = (userData.booths ?? {}) as Record<string, any>;
    Object.entries(booths).forEach(([boothId, visitDataRaw]) => {
      const visitData = visitDataRaw as any;
      const ts = toMillis(visitData?.timestamp);
      if (!Number.isNaN(ts)) {
        visits.push({
          userName: userData.name ?? 'Unknown',
          division: userData.division ?? 'Unknown',
          boothId,
          rating: typeof visitData?.rating === 'number' ? visitData.rating : 0,
          feedback: typeof visitData?.feedback === 'string' ? visitData.feedback : '',
          timestamp: ts,
        });
      }
    });
  });

  return visits;
};

// Get booth popularity data by aggregating all user visits
export const getBoothPopularity = async (): Promise<Record<string, number>> => {
  const popularity: Record<string, number> = {};

  // Initialize all booth IDs with 0 visits
  BOOTH_IDS.forEach(boothId => {
    popularity[boothId] = 0;
  });

  // Get all user visits documents
  const userVisitsSnap = await getDocs(collection(db, "userVisits"));

  // For each user visit document, count booth visits
  userVisitsSnap.forEach((userDoc) => {
    const userData = userDoc.data() as any;
    if (!userData) return;

    const booths = (userData.booths ?? {}) as Record<string, any>;
    Object.entries(booths).forEach(([boothId, visitDataRaw]) => {
      const visitData = visitDataRaw as any;
      const ts = toMillis(visitData?.timestamp);
      if (!Number.isNaN(ts)) {
        popularity[boothId] = (popularity[boothId] || 0) + 1;
      }
    });
  });

  return popularity;
};

// Get booth visitor details by filtering global visits
export const getBoothVisitors = async (boothId: string): Promise<Visit[]> => {
  if (!BOOTH_IDS.includes(boothId)) {
    throw new Error("Invalid booth ID");
  }

  const visits: Visit[] = [];
  const userVisitsSnap = await getDocs(collection(db, "userVisits"));

  userVisitsSnap.forEach((userDoc) => {
    const userData = userDoc.data() as any;
    if (!userData) return;

    const booths = (userData.booths ?? {}) as Record<string, any>;
    const visitData = booths[boothId] as any;
    if (!visitData) return;

    const ts = toMillis(visitData?.timestamp);
    if (!Number.isNaN(ts)) {
      visits.push({
        userName: userData.name ?? 'Unknown',
        division: userData.division ?? 'Unknown',
        boothId,
        rating: typeof visitData?.rating === 'number' ? visitData.rating : 0,
        feedback: typeof visitData?.feedback === 'string' ? visitData.feedback : '',
        timestamp: ts,
      });
    }
  });

  return visits;
};

// Reset user visits (for testing)
export const resetUserVisits = async (): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) return;
  
  const userId = userKey(user.name, user.division);
  const visitRef = doc(db, "userVisits", userId);
  
  // Delete user visits document
  await deleteDoc(visitRef);
};