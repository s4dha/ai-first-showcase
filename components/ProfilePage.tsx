import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Division, User } from '../types';
import { PRIZE_THRESHOLD, BOOTH_IDS, DIVISIONS } from '../constants';
import * as dataService from '../services/dataService';
import Spinner from './Spinner';

interface ProfilePageProps {
  user: User;
  userVisits: dataService.UserVisitsDoc | null;
  onUserUpdate: (name: string, division: string) => Promise<void>;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, userVisits, onUserUpdate }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editDivision, setEditDivision] = useState(user.division);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitedBooths, setVisitedBooths] = useState<{ boothId: string; visit: dataService.BoothVisit }[]>([]);
  const [unvisitedBooths, setUnvisitedBooths] = useState<string[]>([]);

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

  // Normalize timestamp for display using dataService.toMillis
  const formatTime = (rawTs: unknown) => {
    const ms = toMillis(rawTs);
    if (!Number.isFinite(ms)) return 'Unknown';
    return new Date(ms).toLocaleString();
  };

  useEffect(() => {
    if (userVisits) {
      // Extract visited booths with data
      const visited = Object.entries(userVisits.booths ?? {})
        .map(([boothId, rawVisit]) => {
          // Narrow runtime type to dataService.BoothVisit
          const visit = rawVisit as dataService.BoothVisit;
          return { boothId, visit };
        })
        .filter(({ visit }) => {
          // Use toMillis to determine if timestamp exists/valid
          const ms = toMillis((visit as any)?.timestamp);
          return Number.isFinite(ms);
        })
        .sort((a, b) => (toMillis(b.visit.timestamp) || 0) - (toMillis(a.visit.timestamp) || 0));

      setVisitedBooths(visited);

      // Compute unvisited booths (those not present with a valid timestamp)
      const visitedIds = new Set(
        Object.entries(userVisits.booths ?? {})
          .filter(([, rawVisit]) => Number.isFinite(toMillis((rawVisit as any)?.timestamp)))
          .map(([id]) => id)
      );
      const unvisited = BOOTH_IDS.filter(id => !visitedIds.has(id));
      setUnvisitedBooths(unvisited);
    } else {
      setVisitedBooths([]);
      setUnvisitedBooths(BOOTH_IDS.slice());
    }
  }, [userVisits]);

  const handleSave = async () => {
  if (!editName.trim()) {
    setError('Name is required');
    return;
  }
  setIsSaving(true);
  setError(null);

  try {
    await dataService.updateUser(user.name, user.division, editName.trim(), editDivision);
    await onUserUpdate(editName.trim(), editDivision); // 🔥 tell parent to refresh user
    setIsEditing(false);
  } catch (err) {
    console.error('Failed to update profile:', err);
    setError('Failed to save profile. Please try again.');
  } finally {
    setIsSaving(false);
  }
};


  if (!userVisits) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  const uniqueBoothsVisitedCount = Object.entries(userVisits.booths ?? {}).filter(([, rawVisit]) => {
    return Number.isFinite(toMillis((rawVisit as any)?.timestamp));
  }).length;
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

      {/* Profile Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 flex flex-col items-center text-center bg-gray-800/50 rounded-2xl p-6 shadow-lg border border-gray-700">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 text-4xl font-bold text-white shadow-lg ring-4 ring-white/10 ring-offset-4 ring-offset-gray-800">
            {user.name.charAt(0).toUpperCase()}
          </div>

          {isEditing ? (
            <div className="w-full space-y-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                placeholder="Full Name"
              />
              <select
                value={editDivision}
                onChange={(e) => setEditDivision(e.target.value as Division)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                {DIVISIONS.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(user.name);
                    setEditDivision(user.division);
                    setError(null);
                  }}
                  className="px-3 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-white">{user.name}</h3>
              <p className="text-gray-400">{user.division}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 px-4 py-2 border border-indigo-500 text-indigo-400 rounded-md text-sm font-medium hover:bg-indigo-500 hover:text-white transition-colors"
              >
                Edit Profile
              </button>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="md:col-span-2 space-y-6 bg-gray-800/50 rounded-2xl p-6 shadow-lg border border-gray-700">
          <h4 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-3">Activity Summary</h4>
          <div className="flex flex-col md:flex-row items-center justify-around gap-8 text-center">
            <div>
              <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
                {uniqueBoothsVisitedCount}
              </p>
              <p className="text-sm text-gray-400 tracking-wider uppercase">Booths Visited</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
                {hasPrize ? "🏆" : "🤔"}
              </p>
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
                <p className="text-gray-300">
                  You're on your way! Visit <span className="font-bold text-white">
                    {PRIZE_THRESHOLD - uniqueBoothsVisitedCount}
                  </span> more booths to win a prize.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booths to Visit */}
      <div className="bg-gray-800/50 rounded-2xl p-6 shadow-lg border border-gray-700">
        <h4 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-3 mb-4">
          Booths to Visit ({unvisitedBooths.length})
        </h4>
        {unvisitedBooths.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {unvisitedBooths.map((boothId) => (
              <div
                key={boothId}
                className="p-3 bg-gray-700/30 rounded-lg border border-gray-600 text-center text-gray-300 hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate('/scan')}
              >
                {boothId}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">You've visited all booths! 🎉</p>
        )}
      </div>

      {/* Booth Visit History */}
      <div className="bg-gray-800/50 rounded-2xl p-6 shadow-lg border border-gray-700">
        <h4 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-3 mb-4">
          Booth Visit History
        </h4>
        {visitedBooths.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {visitedBooths.map(({ boothId, visit }) => (
              <div key={boothId} className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-white">{boothId}</h5>
                    <p className="text-sm text-gray-400">Visited: {formatTime(visit.timestamp)}</p>
                  </div>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`text-lg ${i < (visit.rating || 0) ? 'text-yellow-400' : 'text-gray-600'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                {visit.feedback && (
                  <p className="mt-2 text-gray-300 italic">"{visit.feedback}"</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">You haven't visited any booths yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;