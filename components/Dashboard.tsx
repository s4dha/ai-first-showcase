import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Visit } from '../types';
import { PRIZE_THRESHOLD } from '../constants';
import DigitalSticker from './DigitalSticker';
import BoothVisitChart from './BoothVisitChart';
import Leaderboard from './Leaderboard';
import Confetti from './Confetti';

interface DashboardProps {
  user: User;
  userVisits: Visit[];
  allVisits: Visit[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, userVisits, allVisits }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const uniqueBoothsVisitedCount = new Set(userVisits.map(v => v.boothId)).size;
    const hasPrize = uniqueBoothsVisitedCount >= PRIZE_THRESHOLD;
    
    const [showConfetti, setShowConfetti] = useState(location.state?.prizeWon || false);

    useEffect(() => {
        if (location.state?.prizeWon) {
            const timer = setTimeout(() => {
                setShowConfetti(false);
                // Clear location state to prevent re-triggering on refresh/navigation
                navigate('.', { replace: true, state: {} });
            }, 5000); // Confetti lasts 5 seconds

            return () => clearTimeout(timer);
        }
    }, [location.state?.prizeWon, navigate]);


    return (
        <div className="space-y-8">
            {showConfetti && <Confetti />}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1 space-y-8">
                    <div className="bg-gray-800/50 rounded-2xl p-6 shadow-lg border border-gray-700 flex flex-col items-center justify-center text-center">
                        <DigitalSticker count={uniqueBoothsVisitedCount} />
                        <button onClick={() => navigate('/scan')} className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-lg text-base font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 transition-transform transform hover:scale-105">
                             <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="24" 
                                height="24" 
                                viewBox="0 0 24 24" // <-- Corrected: added the second "24"
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round">
                                    <path d="M5 12h14"/>
                                    <path d="M12 5v14"/>
                            </svg>
                            Visit a Booth
                        </button>
                    </div>
                    <div className="bg-gray-800/50 rounded-2xl p-6 shadow-lg border border-gray-700">
                        <h3 className="text-xl font-semibold text-purple-400 mb-4">Prize Status</h3>
                        {hasPrize ? (
                            <div className="text-center">
                                <p className="text-5xl mb-2">🎉</p>
                                <p className="text-green-400 font-bold text-lg">Congratulations!</p>
                                <p className="text-gray-300">You've earned a prize for visiting {uniqueBoothsVisitedCount} booths!</p>
                            </div>
                        ) : (
                            <p className="text-gray-400">Visit {PRIZE_THRESHOLD - uniqueBoothsVisitedCount} more booths to win a prize. Keep going!</p>
                        )}
                    </div>
                </div>
                <div className="md:col-span-2 bg-gray-800/50 rounded-2xl p-6 shadow-lg border border-gray-700 min-h-[300px]">
                    <h3 className="text-xl font-semibold text-purple-400 mb-4">Booth Popularity</h3>
                    <BoothVisitChart visits={allVisits} />
                </div>
            </div>
            <div className="bg-gray-800/50 rounded-2xl p-6 shadow-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-purple-400 mb-4">Event Leaderboard</h3>
                <Leaderboard visits={allVisits} currentUser={user} />
            </div>
        </div>
    );
}

export default Dashboard;