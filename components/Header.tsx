import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
const logoUrl = '/AIFirst_Logo.png';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
             <Link to="/" className="flex items-center text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 hover:opacity-80 transition-opacity">
                <img src={logoUrl} alt="Logo" className="h-12 w-12 mr-3" />
                <span>AI-First Showcase</span>
             </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/profile" className="text-right p-2 rounded-md hover:bg-white/10 transition-colors">
              <p className="font-semibold text-white">{user.name}</p>
              <p className="text-sm text-gray-400">{user.division}</p>
            </Link>
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-purple-500 text-purple-400 rounded-md text-sm font-medium hover:bg-purple-500 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;