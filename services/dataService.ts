
import { User, Visit, Division } from '../types';

const USER_KEY = 'showcase_user';
const VISITS_KEY = 'showcase_visits';

// --- User Management ---

export const loginUser = (name: string, division: Division): User => {
  const user: User = { name, division };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
};

export const logoutUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

// --- Visit Management ---

export const getAllVisits = (): Visit[] => {
  const visitsJson = localStorage.getItem(VISITS_KEY);
  return visitsJson ? JSON.parse(visitsJson) : [];
};

export const addVisit = (visit: Omit<Visit, 'timestamp' | 'userName' | 'division'>): Visit => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No user is logged in.');
  }
  
  const allVisits = getAllVisits();
  const newVisit: Visit = {
    ...visit,
    userName: user.name,
    division: user.division,
    timestamp: Date.now(),
  };

  allVisits.push(newVisit);
  localStorage.setItem(VISITS_KEY, JSON.stringify(allVisits));
  return newVisit;
};
