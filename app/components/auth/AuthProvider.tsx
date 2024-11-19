"use client";

import { Amplify } from 'aws-amplify';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, fetchAuthSession, type AuthUser } from 'aws-amplify/auth';

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const identityPoolId = process.env.NEXT_PUBLIC_IDENTITY_POOL_ID;
const region = process.env.NEXT_PUBLIC_AWS_REGION;

console.log('Auth Configuration:', {
  userPoolId,
  userPoolClientId,
  identityPoolId,
  region
});

if (!userPoolId || !userPoolClientId || !identityPoolId || !region) {
  throw new Error('Missing required Cognito configuration');
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      identityPoolId,
      region,
      userPoolClientId,
      authenticationFlowType: 'USER_SRP_AUTH',
      identityPoolRegion: region
    }
  }
});

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkUser = async () => {
    try {
      let currentUser;
      try {
        currentUser = await getCurrentUser();
        console.log('Got current user:', currentUser);
      } catch (e) {
        console.log('No current user found');
        setUser(null);
        setLoading(false);
        return;
      }

      let retries = 2;
      let session;

      while (retries >= 0) {
        try {
          console.log(`Attempt ${2 - retries}: Getting session...`);
          session = await fetchAuthSession();
          console.log('Session details:', {
            hasTokens: !!session?.tokens,
            identityId: session?.identityId,
            hasCredentials: !!session?.credentials
          });

          if (session?.credentials?.accessKeyId) {
            break;
          }
          retries--;
          if (retries >= 0) {
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch (e) {
          console.log(`Session fetch attempt ${2 - retries} failed:`, e);
          retries--;
          if (retries >= 0) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      if (!session?.credentials?.accessKeyId) {
        throw new Error('No credentials in session');
      }

      setUser(currentUser);
      setError(null);
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
      setError(err instanceof Error ? err : new Error('Authentication error'));
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    await checkUser();
  };

  useEffect(() => {
    checkUser();
  }, []);

  const value = {
    user,
    loading,
    error,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}