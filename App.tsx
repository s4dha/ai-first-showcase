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
import { logoUrl } from './logo';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshData = useCallback(() => {
    setAllVisits(dataService.getAllVisits());
  }, []);

  useEffect(() => {
    const loggedInUser = dataService.getCurrentUser();
    if (loggedInUser) {
      setUser(loggedInUser);
      refreshData();
    }
    setIsLoading(false);
  }, [refreshData]);
  
  // Refresh data on navigation to ensure UI is always up-to-date
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [location.pathname, user, refreshData]);

  useEffect(() => {
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    if (favicon) {
      favicon.href = logoUrl;
    }
  }, []);


  const handleLogin = (name: string, division: Division) => {
    const newUser = dataService.loginUser(name, division);
    setUser(newUser);
    refreshData();
    navigate('/');
  };

  const handleLogout = () => {
    dataService.logoutUser();
    setUser(null);
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Spinner />
      </div>
    );
  }

  return (
    <Routes>
      {user ? (
        <Route path="/" element={<MainLayout user={user} onLogout={handleLogout} />}>
          <Route index element={
            <Dashboard 
              user={user}
              userVisits={allVisits.filter(v => v.userName === user.name)}
              allVisits={allVisits}
            />
          } />
          <Route path="profile" element={
             <ProfilePage
                user={user}
                userVisits={allVisits.filter(v => v.userName === user.name)}
             />
          } />
          <Route path="scan" element={<Scanner user={user} />} />
        </Route>
      ) : (
        <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
      )}
    </Routes>
  );
};

// Layout component for authenticated routes
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
    if (name.trim()) {
      onLogin(name.trim(), division);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 p-4">
      <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
        <img src={logoUrl} alt="SCG AI-First Showcase Logo" className="w-32 h-32 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-2">
          SCG AI-First Showcase Passport
        </h1>
        <p className="text-center text-gray-400 mb-8">Log your journey, share your thoughts.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Full Name
            </label>
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
            <label htmlFor="division" className="block text-sm font-medium text-gray-300">
              Division
            </label>
            <select
              id="division"
              value={division}
              onChange={(e) => setDivision(e.target.value as Division)}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
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