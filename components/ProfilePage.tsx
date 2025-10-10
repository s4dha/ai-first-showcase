import React from 'react';
import { Link } from 'react-router-dom';
import { User, Visit } from '../types';
import { PRIZE_THRESHOLD } from '../constants';

interface ProfilePageProps {
  user: User;
  userVisits: Visit[];
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, userVisits }) => {
  const uniqueBoothsVisitedCount = new Set(userVisits.map(v => v.boothId)).size;
  const hasPrize = uniqueBoothsVisitedCount >= PRIZE_THRESHOLD;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
          My Profile
        </h2>
        <Link 
          to="/"
          className="px-4 py-2 border border-purple-500 text-purple-400 rounded-md text-sm font-medium hover:bg-purple-500 hover:text-white transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 flex flex-col items-center text-center bg-gray-800/50 rounded-2xl p-6 shadow-lg border border-gray-700">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 text-4xl font-bold text-white shadow-lg ring-4 ring-white/10 ring-offset-4 ring-offset-gray-800">
                {user.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-2xl font-bold text-white">{user.name}</h3>
            <p className="text-gray-400">{user.division}</p>
        </div>

        <div className="md:col-span-2 space-y-6 bg-gray-800/50 rounded-2xl p-6 shadow-lg border border-gray-700">
           <h4 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-3">Activity Summary</h4>
           <div className="flex flex-col md:flex-row items-center justify-around gap-8 text-center">
                <div>
                    <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">{uniqueBoothsVisitedCount}</p>
                    <p className="text-sm text-gray-400 tracking-wider uppercase">Booths Visited</p>
                </div>
                <div>
                     <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">{hasPrize ? "🏆" : "🤔"}</p>
                    <p className="text-sm text-gray-400 tracking-wider uppercase">Prize Status</p>
                </div>
           </div>
           <div className="pt-4">
            {hasPrize ? (
                <div className="text-center bg-green-900/50 border border-green-500 text-green-300 p-4 rounded-lg">
                    <p className="font-bold">Congratulations!</p>
                    <p>You've earned a prize for visiting {uniqueBoothsVisitedCount} booths!</p>
                </div>
            ) : (
                <div className="text-center bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-gray-300">You're on your way! Visit <span className="font-bold text-white">{PRIZE_THRESHOLD - uniqueBoothsVisitedCount}</span> more booths to win a prize.</p>
                </div>
            )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
