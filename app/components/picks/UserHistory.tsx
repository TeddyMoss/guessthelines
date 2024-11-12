// app/components/picks/UserHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { getUserPicks, getUserStats } from '@/lib/dynamodb';

interface Pick {
  week: string;
  team: string;
  predictedLine: number;
  actualLine: number;
  timestamp: string;
}

interface UserStats {
  totalPicks: number;
  accurateGuesses: number;
  perfectGuesses: number;
  averageDeviation: number;
  weeklyStats: Record<string, {
    picks: number;
    accurate: number;
    perfect: number;
  }>;
}

export default function UserHistory() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);
        const { userId } = await getCurrentUser();
        
        if (!userId) {
          throw new Error('Please log in to view your pick history');
        }

        const [userPicks, userStats] = await Promise.all([
          getUserPicks(userId),
          getUserStats(userId)
        ]);

        setPicks(userPicks);
        setStats(userStats);
      } catch (error) {
        console.error('Error loading user data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load pick history');
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-pulse">Loading your picks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Picks</h3>
            <p className="text-2xl font-bold">{stats.totalPicks}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Accurate Guesses</h3>
            <p className="text-2xl font-bold">
              {((stats.accurateGuesses / stats.totalPicks) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Perfect Guesses</h3>
            <p className="text-2xl font-bold">
              {((stats.perfectGuesses / stats.totalPicks) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg Deviation</h3>
            <p className="text-2xl font-bold">{stats.averageDeviation.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Picks History */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">Week</th>
              <th className="px-4 py-2 text-left">Team</th>
              <th className="px-4 py-2 text-right">Your Line</th>
              <th className="px-4 py-2 text-right">Actual Line</th>
              <th className="px-4 py-2 text-right">Deviation</th>
              <th className="px-4 py-2 text-center">Result</th>
            </tr>
          </thead>
          <tbody>
            {picks.map((pick, index) => (
              <tr key={index} className="border-t">
                <td className="px-4 py-2">Week {pick.week}</td>
                <td className="px-4 py-2">{pick.team}</td>
                <td className="px-4 py-2 text-right">{pick.predictedLine}</td>
                <td className="px-4 py-2 text-right">{pick.actualLine}</td>
                <td className="px-4 py-2 text-right">
                  {Math.abs(pick.predictedLine - pick.actualLine).toFixed(1)}
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`inline-block px-2 py-1 rounded ${
                    Math.abs(pick.predictedLine - pick.actualLine) <= 0.5 
                      ? 'bg-green-100 text-green-800' 
                      : Math.abs(pick.predictedLine - pick.actualLine) <= 3
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {Math.abs(pick.predictedLine - pick.actualLine) <= 0.5 
                      ? 'PERFECT'
                      : Math.abs(pick.predictedLine - pick.actualLine) <= 3
                      ? 'CLOSE'
                      : 'OFF'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}