// app/components/picks/UserHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { getUserPicks } from '@/lib/dynamodb';
import Link from 'next/link';

interface Pick {
  week: string;
  team: string;
  predictedLine: number;
  actualLine: number;
  timestamp: string;
}

export default function UserHistory({ userId }: { userId: string }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPicks = async () => {
      try {
        const userPicks = await getUserPicks(userId);
        setPicks(userPicks);
      } catch (error) {
        console.error('Error loading picks:', error);
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

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Week</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Team</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Your Line</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actual Line</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {picks.map((pick, index) => {
              const difference = Math.abs(pick.predictedLine - pick.actualLine);
              return (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-900">Week {pick.week}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{pick.team}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {pick.predictedLine > 0 ? `+${pick.predictedLine}` : pick.predictedLine}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {pick.actualLine > 0 ? `+${pick.actualLine}` : pick.actualLine}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right ${
                    difference <= 0.5 ? 'text-green-600' :
                    difference <= 3 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {difference.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}