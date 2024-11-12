'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { getUserPicks, getUserStats } from '@/lib/dynamodb';

export default function PicksHistoryPage() {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (!currentUser?.userId) {
          throw new Error('Please log in to view your picks');
        }

        const userPicks = await getUserPicks(currentUser.userId);
        setPicks(userPicks);
      } catch (err) {
        console.error('Error loading picks:', err);
        setError(err.message || 'Failed to load picks');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return <div className="p-4">Loading your picks history...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!user) {
    return <div className="p-4">Please log in to view your picks history.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Pick History</h1>
      {picks.length === 0 ? (
        <p>No picks found. Make some picks to see them here!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Week</th>
                <th className="px-4 py-2 text-left">Team</th>
                <th className="px-4 py-2 text-right">Your Line</th>
                <th className="px-4 py-2 text-right">Actual Line</th>
                <th className="px-4 py-2 text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((pick, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2">Week {pick.week}</td>
                  <td className="px-4 py-2">{pick.team}</td>
                  <td className="px-4 py-2 text-right">{pick.predictedLine}</td>
                  <td className="px-4 py-2 text-right">{pick.actualLine || 'TBD'}</td>
                  <td className="px-4 py-2 text-right">
                    {pick.actualLine 
                      ? Math.abs(pick.predictedLine - pick.actualLine).toFixed(1) 
                      : 'TBD'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}