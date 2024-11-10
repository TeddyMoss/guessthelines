// contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (err) {
      setUser(null);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to get user');
      }
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to sign out');
      }
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading,
        error,
        signOut: handleSignOut,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}