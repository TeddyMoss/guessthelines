// components/UserHistory.tsx

import React, { useState, useEffect } from 'react';
import { getUserPicks, getUserStats } from '@/lib/dynamodb';

// Types
interface UserStats {
  totalPicks: number;
  accurateGuesses: number;
  perfectGuesses: number;
  averageDeviation: number;
  currentStreak: number;
  bestStreak: number;
  weeklyStats: {
    [week: string]: {
      picks: number;
      accurate: number;
      perfect: number;
    }
  }
}

interface Pick {
  gameId: string;
  team: string;
  predictedLine: number;
  actualLine: number;
  week: string;
  timestamp: string;
}

// Stats Card Component
const StatCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
  <div className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow">
    <h3 className="text-sm text-gray-600 font-medium">{title}</h3>
    <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
  </div>
);

// Pick Card Component
const PickCard = ({ pick }: { pick: Pick }) => {
  const deviation = Math.abs(pick.predictedLine - pick.actualLine);
  const isPerfect = deviation <= 0.5;
  const isClose = deviation <= 3;

  return (
    <div className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-all transform hover:-translate-y-0.5">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="font-medium text-gray-900">{pick.team}</div>
          <div className="text-sm text-gray-500">Week {pick.week}</div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-600">Your Pick</div>
            <div className="font-medium">{pick.predictedLine > 0 ? '+' : ''}{pick.predictedLine}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Actual</div>
            <div className="font-medium">{pick.actualLine > 0 ? '+' : ''}{pick.actualLine}</div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isPerfect 
              ? 'bg-green-100 text-green-800' 
              : isClose 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
          }`}>
            {isPerfect ? 'Perfect!' : isClose ? 'Close!' : `${deviation.toFixed(1)} off`}
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-lg"/>
      ))}
    </div>
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-200 rounded-lg"/>
      ))}
    </div>
  </div>
);

// Empty State
const EmptyState = () => (
  <div className="text-center py-12">
    <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
      {/* You could add an icon here */}
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No Picks Yet</h3>
    <p className="text-gray-500">Make your first picks to start building your stats!</p>
  </div>
);

// Main Component
export default function UserHistory({ userId }: { userId: string }) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [userStats, userPicks] = await Promise.all([
          getUserStats(userId),
          getUserPicks(userId, selectedWeek || undefined)
        ]);
        setStats(userStats);
        setPicks(userPicks);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
      setLoading(false);
    };

    loadData();
  }, [userId, selectedWeek]);

  if (loading) return <LoadingSkeleton />;
  if (!stats && picks.length === 0) return <EmptyState />;

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div>
        <h2 className="text-xl font-bold mb-4">Your Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard 
            title="Total Picks" 
            value={stats?.totalPicks || 0} 
          />
          <StatCard 
            title="Accuracy" 
            value={`${((stats?.accurateGuesses || 0) / (stats?.totalPicks || 1) * 100).toFixed(1)}%`}
            subtitle={`${stats?.accurateGuesses || 0} accurate picks`}
          />
          <StatCard 
            title="Perfect Picks" 
            value={stats?.perfectGuesses || 0}
            subtitle={`${((stats?.perfectGuesses || 0) / (stats?.totalPicks || 1) * 100).toFixed(1)}%`}
          />
          <StatCard 
            title="Average Deviation" 
            value={`${(stats?.averageDeviation || 0).toFixed(1)}`}
            subtitle="points off"
          />
        </div>
      </div>

      {/* Week Selector */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Pick History</h2>
          <select 
            className="border rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={selectedWeek || ''}
            onChange={(e) => setSelectedWeek(e.target.value)}
          >
            <option value="">All Weeks</option>
            {Object.keys(stats?.weeklyStats || {}).map((week) => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>

        {/* Picks List */}
        <div className="space-y-4">
          {picks.length > 0 ? (
            picks.map((pick) => (
              <PickCard key={pick.gameId} pick={pick} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No picks found for this week
            </div>
          )}
        </div>
      </div>
    </div>
  );
}