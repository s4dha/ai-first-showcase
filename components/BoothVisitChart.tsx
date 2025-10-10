
import React from 'react';
import { Visit } from '../types';
import { BOOTH_IDS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface BoothVisitChartProps {
  visits: Visit[];
}

const BoothVisitChart: React.FC<BoothVisitChartProps> = ({ visits }) => {
  const visitCounts = BOOTH_IDS.map(boothId => {
    const count = visits.filter(visit => visit.boothId === boothId).length;
    return { name: boothId, visits: count };
  });

  const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

  if (visits.length === 0) {
    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            <p>Scan your first booth to see data here!</p>
        </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            <BarChart data={visitCounts} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                <XAxis dataKey="name" stroke="#a0aec0" />
                <YAxis allowDecimals={false} stroke="#a0aec0" />
                <Tooltip
                    cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4a5568', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#d1d5db' }}
                />
                <Bar dataKey="visits">
                    {visitCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default BoothVisitChart;
