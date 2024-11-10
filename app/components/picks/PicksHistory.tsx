// components/PicksHistory.tsx

import React from 'react';
import { useState, useEffect } from 'react';
import { getUserPicks, getUserStats, type UserStats } from '../../lib/dynamodb';

interface PicksHistoryProps {
  userId: string;
  currentWeek: string;
}

export default function PicksHistory({ userId, currentWeek }: PicksHistoryProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>(currentWeek);
  const [weeklyPicks, setWeeklyPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const [userStats, picks] = await Promise.all([
          getUserStats(userId),
          getUserPicks(userId, selectedWeek)
        ]);
        setStats(userStats);
        setWeeklyPicks(picks);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
      setLoading(false);
    };

    loadUserData();
  }, [userId, selectedWeek]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Your Stats</h2>
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Picks</div>
              <div className="text-2xl font-bold">{stats.totalPicks}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Accurate Guesses</div>
              <div className="text-2xl font-bold">{stats.accurateGuesses}</div>
              <div className="text-sm text-gray-500">
                ({((stats.accurateGuesses / stats.totalPicks) * 100).toFixed(1)}%)
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Perfect Guesses</div>
              <div className="text-2xl font-bold">{stats.perfectGuesses}</div>
              <div className="text-sm text-gray-500">
                ({((stats.perfectGuesses / stats.totalPicks) * 100).toFixed(1)}%)
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Avg. Deviation</div>
              <div className="text-2xl font-bold">{stats.averageDeviation.toFixed(1)}</div>
              <div className="text-sm text-gray-500">points</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-600">No stats available yet</div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4">Week {selectedWeek} Picks</h3>
        {weeklyPicks.length > 0 ? (
          <div className="space-y-4">
            {weeklyPicks.map((pick) => (
              <div 
                key={pick.gameId} 
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium">{pick.team}</div>
                  <div className="flex items-center space-x-4">
                    <div className="text-gray-600">
                      Your pick: {pick.predictedLine > 0 ? '+' : ''}{pick.predictedLine}
                    </div>
                    <div className="text-gray-600">
                      Actual: {pick.actualLine > 0 ? '+' : ''}{pick.actualLine}
                    </div>
                    <div 
                      className={`px-2 py-1 rounded text-sm ${
                        isPerfectPick(pick.predictedLine, pick.actualLine)
                          ? 'bg-green-100 text-green-800'
                          : isAccuratePick(pick.predictedLine, pick.actualLine)
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {isPerfectPick(pick.predictedLine, pick.actualLine)
                        ? 'Perfect!'
                        : isAccuratePick(pick.predictedLine, pick.actualLine)
                          ? 'Close!'
                          : Math.abs(pick.predictedLine - pick.actualLine).toFixed(1) + ' off'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-600">No picks for this week</div>
        )}
      </div>
    </div>
  );
}