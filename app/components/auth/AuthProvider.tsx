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
      signUpVerificationMethod: 'code',
      authenticationFlowType: 'USER_SRP_AUTH',
    },
    credentialProvider: {
      identityPoolId,
      identityPoolRegion: region,
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      customRoleArn: `arn:aws:iam::594692202788:role/service-role/GuessTheLines_Auth_Role`
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
      console.log('Starting auth check...');
      const currentUser = await getCurrentUser();
      console.log('Got current user:', currentUser);

      console.log('Fetching auth session...');
      const session = await fetchAuthSession();
      console.log('Session details:', {
        hasTokens: !!session.tokens,
        idToken: !!session.tokens?.idToken,
        accessToken: !!session.tokens?.accessToken,
        identityId: session.identityId,
        credentials: {
          hasCredentials: !!session.credentials,
          hasAccessKey: !!session.credentials?.accessKeyId,
          hasSecretKey: !!session.credentials?.secretAccessKey,
        }
      });

      if (!session?.credentials?.accessKeyId) {
        console.log('Retrying session fetch after delay...');
        await new Promise(r => setTimeout(r, 2000));
        
        const retrySession = await fetchAuthSession();
        console.log('Retry session details:', {
          hasTokens: !!retrySession.tokens,
          identityId: retrySession.identityId,
          hasCredentials: !!retrySession.credentials,
          accessKeyPresent: !!retrySession.credentials?.accessKeyId,
          secretKeyPresent: !!retrySession.credentials?.secretAccessKey
        });

        if (!retrySession?.credentials?.accessKeyId) {
          throw new Error('Failed to obtain credentials after retry');
        }
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