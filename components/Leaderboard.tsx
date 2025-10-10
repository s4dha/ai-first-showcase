import React from 'react';
// FIX: Import Division to use for more precise typing in the accumulator.
import { User, Visit, Division } from '../types';
import { PRIZE_THRESHOLD } from '../constants';

interface LeaderboardProps {
  visits: Visit[];
  currentUser: User;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ visits, currentUser }) => {
  // FIX: Explicitly typing the 'acc' (accumulator) parameter in the reduce function allows
  // TypeScript to correctly infer the return type of `visitorData`. This resolves the issue
  // where `v` in the subsequent `.map()` was of type `unknown`, causing the errors.
  const visitorData = visits.reduce((acc: Record<string, { name: string; division: Division; booths: Set<string> }>, visit) => {
    if (!acc[visit.userName]) {
      acc[visit.userName] = { name: visit.userName, division: visit.division, booths: new Set<string>() };
    }
    acc[visit.userName].booths.add(visit.boothId);
    return acc;
  }, {});

  const sortedVisitors = Object.values(visitorData)
    .map(v => ({ ...v, count: v.booths.size }))
    .sort((a, b) => b.count - a.count);

  const topVisitors = sortedVisitors.slice(0, 5);
  const prizeWinners = sortedVisitors.filter(v => v.count >= PRIZE_THRESHOLD);
  const totalParticipants = new Set(visits.map(v => v.userName)).size;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="bg-gray-700/50 p-4 rounded-lg">
          <p className="text-4xl font-bold text-indigo-400">{totalParticipants}</p>
          <p className="text-sm text-gray-400">Total Participants</p>
        </div>
        <div className="bg-gray-700/50 p-4 rounded-lg">
          <p className="text-4xl font-bold text-indigo-400">{topVisitors.length > 0 ? topVisitors[0].count : 0}</p>
          <p className="text-sm text-gray-400">Top Score</p>
        </div>
        <div className="bg-gray-700/50 p-4 rounded-lg">
          <p className="text-4xl font-bold text-indigo-400">{prizeWinners.length}</p>
          <p className="text-sm text-gray-400">Prize Winners</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-lg font-semibold text-gray-300 mb-4">Top 5 Visitors</h4>
          {topVisitors.length > 0 ? (
            <ul className="space-y-3">
              {topVisitors.map((visitor, index) => (
                <li key={visitor.name} className={`flex items-center justify-between p-3 rounded-md ${visitor.name === currentUser.name ? 'bg-purple-600/30 border border-purple-500' : 'bg-gray-700/50'}`}>
                  <div className="flex items-center space-x-4">
                    <span className="font-bold text-lg text-gray-400">{index + 1}</span>
                    <div>
                      <p className="font-medium text-white">{visitor.name}</p>
                      <p className="text-xs text-gray-400">{visitor.division}</p>
                    </div>
                  </div>
                  <span className="font-bold text-lg text-purple-400">{visitor.count} booths</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No visits recorded yet.</p>
          )}
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-300 mb-4">Prize Winners ({`>= ${PRIZE_THRESHOLD} booths`})</h4>
          {prizeWinners.length > 0 ? (
            <ul className="space-y-2 h-48 overflow-y-auto pr-2">
              {prizeWinners.map(winner => (
                <li key={winner.name} className={`flex items-center space-x-3 p-2 rounded-md ${winner.name === currentUser.name ? 'bg-purple-600/30' : 'bg-gray-700/50'}`}>
                  <span className="text-yellow-400">🏆</span>
                  <div>
                    <p className="font-medium text-white">{winner.name}</p>
                    <p className="text-xs text-gray-400">{winner.division}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No prize winners yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
