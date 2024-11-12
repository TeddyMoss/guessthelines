// app/picks/history/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getCurrentUser, type AuthUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserHistory from '@/components/picks/UserHistory';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthUserWithId extends AuthUser {
  userId: string;
}

export default function PicksHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        
        if (!currentUser.userId) {
          throw new Error('User ID not found');
        }
        
        setUser(currentUser as AuthUserWithId);
      } catch (err) {
        console.error('Auth error:', err);
        setError('Please log in to view your pick history');
        // Don't immediately redirect - show error message first
        setTimeout(() => router.push('/'), 3000);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent" />
          <p className="text-gray-600">Loading your pick history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <p className="mt-4 text-center text-gray-600">
            Redirecting to home page...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pick History</h1>
            <p className="text-gray-600 mt-1">
              View and analyze your previous picks
            </p>
          </div>
          
          <Link 
            href="/"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Picks
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm">
          <UserHistory userId={user.userId} />
        </div>
      </div>
    </div>
  );
}