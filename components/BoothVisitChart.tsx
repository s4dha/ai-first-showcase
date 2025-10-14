import React from "react";
import { BOOTH_IDS } from "../constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";
import { motion } from "framer-motion";

interface BoothVisitChartProps {
  popularity: Record<string, number>;
}

const BoothVisitChart: React.FC<BoothVisitChartProps> = ({ popularity }) => {
  const visitCounts = BOOTH_IDS.map((boothId) => ({
    name: boothId,
    visits: popularity[boothId] || 0,
  }));

  // Check if we have any visits
  const totalVisits = Object.values(popularity).reduce((sum: number, count: number) => sum + count, 0);
  
  const gradientColors = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

  if (totalVisits === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 bg-gray-900 border border-gray-800 rounded-xl">
        <p>No booth visits recorded yet!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-400">
          Total Visits: <strong>{totalVisits}</strong>
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full h-[320px]"
      >
        <ResponsiveContainer>
          <BarChart
            data={visitCounts}
            margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
          >
            <defs>
              {gradientColors.map((color, i) => (
                <linearGradient
                  key={i}
                  id={`barGradient${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(139, 92, 246, 0.1)" }}
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #4b5563",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "#d1d5db" }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Bar dataKey="visits" radius={[6, 6, 0, 0]} animationDuration={700}>
              {visitCounts.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#barGradient${index % gradientColors.length})`}
                />
              ))}
              <LabelList
                dataKey="visits"
                position="top"
                fill="#d1d5db"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};

export default BoothVisitChart;