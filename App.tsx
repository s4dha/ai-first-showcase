import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { User, Visit, Division } from './types';
import { DIVISIONS } from './constants';
import * as dataService from './services/dataService';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import ProfilePage from './components/ProfilePage';
import Spinner from './components/Spinner';

// ✅ Put AIFirst_Logo.png in /public (project root)
const LOGO_SRC = '/AIFirst_Logo.png';

const App: React.FC = () => {
const [user, setUser] = useState<User | null>(null);
const [myVisits, setMyVisits] = useState<Visit[]>([]);
const [allVisits, setAllVisits] = useState<Visit[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();


// load both: my visits (for Profile/Dashboard cards) and all visits (for Leaderboard)
const refreshData = useCallback(async () => {
  try {
    const mine = await dataService.getAllVisits();          // your existing per-user loader
    const all  = await dataService.getAllVisitsGlobal();    // NEW: everyone
    setMyVisits(mine || []);
    setAllVisits(all || []);
  } catch (e: any) {
    console.error(e);
    setError(e?.message ?? 'Failed to load visits');
  }
}, []);

  // initial load: get cached user, then fetch visits
  useEffect(() => {
    (async () => {
      try {
        const loggedInUser = await dataService.getCurrentUser(); // ← async now
        if (loggedInUser) {
          setUser(loggedInUser);
          await refreshData();
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshData]);

  // refresh on route change while logged in
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [location.pathname, user, refreshData]);

  // set favicon
  useEffect(() => {
    const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
    if (favicon) favicon.href = LOGO_SRC;
  }, []);

  const handleLogin = async (name: string, division: Division) => {
    try {
      const newUser = await dataService.loginUser(name, division); // ← await
      setUser(newUser);
      await refreshData();
      navigate('/');
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await dataService.logoutUser?.(); // if you kept it sync it still works
    } finally {
      setUser(null);
      setAllVisits([]);
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-red-300">
        <div className="max-w-lg p-6 bg-gray-800 rounded-xl border border-gray-700">
          <p className="font-semibold mb-2">Something went wrong</p>
          <pre className="text-sm whitespace-pre-wrap">{error}</pre>
          <button
            className="mt-4 px-4 py-2 rounded bg-indigo-600 text-white"
            onClick={() => { setError(null); window.location.reload(); }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {user ? (
        <Route path="/" element={<MainLayout user={user} onLogout={handleLogout} />}>
          <Route
            index
            element={
              <Dashboard
                user={user}
                // getAllVisits already returns only this user's visits, but keeping this is harmless
                userVisits={allVisits.filter(v => v.userName === user.name)}
                allVisits={allVisits}
              />
            }
          />
          <Route
            path="profile"
            element={
              <ProfilePage
                user={user}
                userVisits={allVisits.filter(v => v.userName === user.name)}
              />
            }
          />
          <Route path="scan" element={<Scanner user={user} />} />
        </Route>
      ) : (
        <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
      )}
    </Routes>
  );
};

const MainLayout: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header user={user} onLogout={onLogout} />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

interface LoginPageProps {
  onLogin: (name: string, division: Division) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [division, setDivision] = useState<Division>(DIVISIONS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onLogin(name.trim(), division);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 p-4">
      <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
        <img src={LOGO_SRC} alt="SCG AI-First Showcase Logo" className="w-32 h-32 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-2">
          SCG AI-First Showcase Passport
        </h1>
        <p className="text-center text-gray-400 mb-8">Log your journey, share your thoughts.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              placeholder="e.g. Alex Tan"
              required
            />
          </div>
          <div>
            <label htmlFor="division" className="block text-sm font-medium text-gray-300">Division</label>
            <select
              id="division"
              value={division}
              onChange={(e) => setDivision(e.target.value as Division)}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 transition-transform transform hover:scale-105"
          >
            Start Exploring
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
