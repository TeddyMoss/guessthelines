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
      loginWith: {
        email: true,
        phoneNumber: false,
        username: false
      }
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
      let retries = 3;
      while (retries > 0) {
        try {
          const currentUser = await getCurrentUser();
          console.log('Got current user:', currentUser);

          const session = await fetchAuthSession();
          console.log('Session details:', {
            hasTokens: !!session.tokens,
            tokenExpiration: session.tokens?.idToken?.expiration,
            identityId: session.identityId,
            credentials: !!session.credentials,
            accessKeyId: !!session.credentials?.accessKeyId,
            secretKey: !!session.credentials?.secretAccessKey
          });

          if (session?.credentials?.accessKeyId) {
            setUser(currentUser);
            setError(null);
            return;
          } else {
            console.log(`No credentials in attempt ${4 - retries}`);
          }
        } catch (e) {
          console.error(`Auth attempt ${4 - retries} failed:`, e);
        }
        retries--;
        if (retries > 0) {
          console.log(`Waiting before retry ${4 - retries}`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      throw new Error('Failed to obtain credentials after retry');
    } catch (err) {
      console.error('Auth check error details:', {
        error: err,
        errorType: err instanceof Error ? err.name : 'Unknown error type',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        hasUser: !!user
      });
      
      setUser(null);
      setError(err instanceof Error ? err : new Error('Authentication error'));
      
      try {
        localStorage.clear();
      } catch (e) {
        console.error('Failed to clear localStorage:', e);
      }
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