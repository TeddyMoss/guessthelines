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

try {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        identityPoolId,
        region,
        signUpVerificationMethod: 'code',
        authenticationFlowType: 'USER_SRP_AUTH'
      }
    }
  });
  console.log('Amplify configured successfully');
} catch (error) {
  console.error('Error configuring Amplify:', error);
}

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
      // First ensure we can get the current user
      const currentUser = await getCurrentUser();
      console.log('Current user:', currentUser);

      // Then explicitly fetch a new auth session with retries
      let session = null;
      let retries = 3;
      
      while (retries > 0 && (!session?.credentials?.accessKeyId)) {
        try {
          session = await fetchAuthSession();
          console.log(`Auth session details (attempt ${4 - retries}):`, {
            hasTokens: !!session.tokens,
            identityId: session.identityId,
            hasCredentials: !!session.credentials,
            accessKeyPresent: !!session.credentials?.accessKeyId,
            secretKeyPresent: !!session.credentials?.secretAccessKey
          });

          if (session?.credentials?.accessKeyId) {
            break;
          }

          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (sessionError) {
          console.error(`Session fetch error (attempt ${4 - retries}):`, sessionError);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!session?.credentials?.accessKeyId) {
        throw new Error('Failed to obtain credentials after retries');
      }
      
      setUser(currentUser);
      setError(null);
    } catch (err) {
      console.error('Auth check error details:', {
        error: err,
        errorType: err instanceof Error ? err.name : 'Unknown error type',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        hasUser: !!user
      });
      
      setUser(null);
      setError(err instanceof Error ? err : new Error('Authentication error'));
      
      // Clear any stale state
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