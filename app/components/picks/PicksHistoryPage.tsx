'use client';

import React, { useState, useEffect } from 'react';
import { getUserPicks } from '@/lib/dynamodb';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  currentWeek: string;
}

export default function PicksHistory({ userId, currentWeek }: Props) {
  const [loading, setLoading] = useState(true);
  const [picks, setPicks] = useState([]);

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
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {picks.map((pick: any) => (
        <div key={pick.gameId} className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center">
            <div>{pick.team}</div>
            <div>Line: {pick.line}</div>
            <div>Actual: {pick.actualLine}</div>
          </div>
        </div>
      ))}
    </div>
  );
}