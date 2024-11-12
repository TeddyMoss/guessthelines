// app/picks/history/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { signOut } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';

export default function PicksHistoryPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pick History</h1>
          <div className="flex gap-4">
            <Link 
              href="/"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Back to Picks
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          History will go here
        </div>
      </div>
    </div>
  );
}