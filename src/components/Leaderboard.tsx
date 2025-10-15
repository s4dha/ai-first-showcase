// src/components/Leaderboard.tsx
import React from 'react';
import { User, Visit, Division } from '../helpers/types';
import { PRIZE_THRESHOLD } from '../helpers/constants';

type BoothVisitorsAggregate = Record<
  string,
  {
    visitors?: Record<
      string,
      { name: string; division: Division; rating?: number; feedback?: string; timestamp?: number }
    >;
  }
>;

interface LeaderboardProps {
  visits: Visit[] | BoothVisitorsAggregate;
  currentUser: User;
}

const plural = (n: number, singular: string) => (n === 1 ? singular : `${singular}s`);

const Leaderboard: React.FC<LeaderboardProps> = ({ visits, currentUser }) => {
  const normalizeToVisitArray = (input: Visit[] | BoothVisitorsAggregate): Visit[] => {
    if (Array.isArray(input)) return input;
    const out: Visit[] = [];
    Object.entries(input).forEach(([boothId, boothData]) => {
      const visitors = boothData?.visitors;
      if (!visitors) return;
      Object.entries(visitors).forEach(([userId, v]) => {
        out.push({
          userName: v.name,
          division: v.division,
          boothId,
          rating: v.rating ?? 0,
          feedback: v.feedback ?? '',
          timestamp: v.timestamp ?? Date.now(),
        });
      });
    });
    return out;
  };

  const flatVisits = normalizeToVisitArray(visits);

  const visitorData = flatVisits.reduce(
    (acc: Record<string, { name: string; division: Division; booths: Set<string> }>, visit) => {
      if (!acc[visit.userName]) {
        acc[visit.userName] = { name: visit.userName, division: visit.division, booths: new Set<string>() };
      }
      acc[visit.userName].booths.add(visit.boothId);
      return acc;
    },
    {}
  );

  const boothData = flatVisits.reduce(
    (acc: Record<string, { boothId: string; visitors: Set<string> }>, visit) => {
      if (!acc[visit.boothId]) {
        acc[visit.boothId] = { boothId: visit.boothId, visitors: new Set<string>() };
      }
      acc[visit.boothId].visitors.add(visit.userName);
      return acc;
    },
    {}
  );

  const sortedVisitors = Object.values(visitorData)
    .map((v) => ({ ...v, count: v.booths.size }))
    .sort((a, b) => b.count - a.count);

  const sortedBooths = Object.values(boothData)
    .map((b) => ({ ...b, count: b.visitors.size }))
    .sort((a, b) => b.count - a.count);

  const topVisitors = sortedVisitors.slice(0, 30);
  const topBooths = sortedBooths.slice(0, 5);
  const totalParticipants = new Set(flatVisits.map((v) => v.userName)).size;

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
        <div className="bg-gray-600/40 border border-gray-500/60 p-4 rounded-lg h-full">
          <p className="text-4xl font-bold text-indigo-400">{totalParticipants}</p>
          <p className="text-sm text-gray-400">Total Participants</p>
        </div>
        <div className="bg-gray-600/40 border border-gray-500/60 p-4 rounded-lg h-full">
          <p className="text-4xl font-bold text-indigo-400">{topVisitors.length > 0 ? topVisitors[0].count : 0}</p>
          <p className="text-sm text-gray-400">Top Score</p>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* --- Left: Top 5 Booths --- */}
        <div className="bg-gray-600/40 border border-gray-500/60 rounded-xl p-4">
          <h4 className="text-lg font-semibold text-orange-400 mb-4">Most Visited Booths</h4>
          {topBooths.length > 0 ? (
            <ul className="space-y-3">
              {topBooths.map((booth, index) => (
                <li
                  key={booth.boothId}
                  className="flex items-center justify-between p-3 rounded-md bg-gray-600/40 border border-gray-500/60"
                >
                  <div className="flex items-center space-x-4">
                    <span className="font-bold text-lg text-gray-400">{index + 1}</span>
                    <div>
                      <p className="font-medium text-white">{booth.boothId}</p>
                    </div>
                  </div>
                  <span className="font-bold text-lg text-purple-400">
                    {booth.count} {plural(booth.count, 'participant')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No booth visits yet.</p>
          )}
        </div>

        {/* --- Right: Top 30 Participants --- */}
        <div className="bg-gray-600/40 border border-gray-500/60 rounded-xl p-4">
          <h4 className="text-lg font-semibold text-orange-400 mb-4">Top 30 Participants</h4>
          {topVisitors.length > 0 ? (
            <ul className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {topVisitors.map((visitor, index) => (
                <li
                  key={visitor.name}
                  className={`flex items-center justify-between p-3 rounded-md ${
                    visitor.name === currentUser.name
                      ? 'bg-purple-600/30 border border-purple-500'
                      : 'bg-gray-600/40 border border-gray-500/60'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="font-bold text-lg text-gray-400">{index + 1}</span>
                    <div>
                      <p className="font-medium text-white">{visitor.name}</p>
                      <p className="text-xs text-gray-400">{visitor.division}</p>
                    </div>
                  </div>
                  <span className="font-bold text-lg text-purple-400">
                    {visitor.count} {plural(visitor.count, 'booth')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No visits recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
