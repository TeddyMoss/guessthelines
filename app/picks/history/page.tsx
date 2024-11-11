'use client';

import React, { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PicksHistory from '../../../components/picks/PicksHistory';
import { getUserPicks } from '../../../lib/dynamodb';

// Empty State Component
const EmptyState = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center bg-white rounded-lg shadow p-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">No Picks Found</h2>
    <p className="text-gray-600 mb-6 text-center">
      Looks like you haven't made any picks yet. Head back to make your first predictions!
    </p>
    <Link 
      href="/"
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
    >
      Make Your First Picks
    </Link>
  </div>
);

export default function PicksHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [hasPicks, setHasPicks] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Check auth
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        // Get current week
        const response = await fetch('/api/odds');
        if (!response.ok) throw new Error('Failed to fetch game data');
        const data = await response.json();
        setCurrentWeek(data.currentWeek);

        // Check if user has any picks
        if (currentUser) {
          const picks = await getUserPicks(currentUser.userId);
          setHasPicks(picks && picks.length > 0);
        }
      } catch (err) {
        console.error('Error in history page:', err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pick History</h1>
          <Link 
            href="/"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Picks
          </Link>
        </div>
        
        {hasPicks && currentWeek ? (
          <PicksHistory 
            userId={user.userId} 
            currentWeek={currentWeek}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}