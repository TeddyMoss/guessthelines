// app/components/picks/UserHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { getUserPicks } from '@/lib/dynamodb';
import Link from 'next/link';

interface Pick {
  weekId: string;  // Changed from week to match DynamoDB
  team: string;
  predictedLine: number;
  actualLine: number;
  gameId: string;
  timestamp: string;
}

export default function UserHistory({ userId }: { userId: string }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPicks = async () => {
      try {
        console.log('Fetching picks for user:', userId);
        const userPicks = await getUserPicks(userId);
        console.log('Loaded picks in history:', {
          total: userPicks.length,
          picks: userPicks
        });
        setPicks(userPicks);
      } catch (error) {
        console.error('Error loading picks:', error);
        setError('Failed to load picks history');
      } finally {
        setLoading(false);
      }
    };

    loadPicks();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 px-4">
        <div className="text-red-600 mb-4">{error}</div>
        <Link 
          href="/"
          className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Back to Picks
        </Link>
      </div>
    );
  }

  if (!picks.length) {
    return (
      <div className="text-center py-16 px-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Picks Yet</h3>
        <p className="text-gray-600 mb-6">Make some predictions to start building your history!</p>
        <Link 
          href="/"
          className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Make Predictions
        </Link>
      </div>
    );
  }

  // Group picks by week
  const picksByWeek = picks.reduce((acc, pick) => {
    const week = pick.weekId;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(pick);
    return acc;
  }, {} as Record<string, Pick[]>);

  return (
    <div className="overflow-hidden p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Pick History</h2>
          <Link 
            href="/"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Picks
          </Link>
        </div>

        {Object.entries(picksByWeek)
          .sort(([weekA], [weekB]) => parseInt(weekB) - parseInt(weekA))
          .map(([week, weekPicks]) => (
            <div key={week} className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Week {week}</h3>
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Team</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Your Line</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actual Line</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {weekPicks.map((pick) => {
                      const difference = Math.abs(pick.predictedLine - pick.actualLine);
                      return (
                        <tr key={pick.gameId}>
                          <td className="px-4 py-3 text-sm text-gray-900">{pick.team}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {pick.predictedLine > 0 ? `+${pick.predictedLine}` : pick.predictedLine}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {pick.actualLine > 0 ? `+${pick.actualLine}` : pick.actualLine}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${
                            difference <= 0.5 ? 'text-green-600 font-semibold' :
                            difference <= 3 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {difference.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
