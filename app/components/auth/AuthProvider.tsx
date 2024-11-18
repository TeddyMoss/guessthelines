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
      authenticationFlowType: 'USER_SRP_AUTH',
      oauth: {
        domain: 'guessthelines.app',
        scope: ['email', 'openid'],
        redirectSignIn: 'https://guessthelines.app',
        redirectSignOut: 'https://guessthelines.app',
        responseType: 'code'
      },
      tokenRefreshWindow: 24 * 60 * 60 * 1000,
      refreshCooldown: 0,
      pushCognitoCredentialsToDeviceKeystore: true,
      rejectDeviceKeystore: false
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
      console.log('Starting checkUser...');
      const currentUser = await getCurrentUser();
      console.log('Current user:', currentUser);

      console.log('Fetching auth session...');
      const session = await fetchAuthSession();
      console.log('Auth session details:', {
        hasSession: !!session,
        tokens: {
          idToken: !!session.tokens?.idToken,
          accessToken: !!session.tokens?.accessToken,
          expiration: session.tokens?.idToken?.expiration
        },
        identityId: session.identityId,
        credentials: {
          accessKeyId: !!session.credentials?.accessKeyId,
          secretKey: !!session.credentials?.secretAccessKey,
          sessionToken: !!session.credentials?.sessionToken
        }
      });

      if (!session?.credentials?.accessKeyId) {
        console.log('No credentials in initial session, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const retrySession = await fetchAuthSession();
        console.log('Retry session details:', {
          hasSession: !!retrySession,
          tokens: {
            idToken: !!retrySession.tokens?.idToken,
            accessToken: !!retrySession.tokens?.accessToken,
            expiration: retrySession.tokens?.idToken?.expiration
          },
          identityId: retrySession.identityId,
          credentials: {
            accessKeyId: !!retrySession.credentials?.accessKeyId,
            secretKey: !!retrySession.credentials?.secretAccessKey,
            sessionToken: !!retrySession.credentials?.sessionToken
          }
        });
        
        if (!retrySession.credentials?.accessKeyId) {
          throw new Error('Failed to obtain credentials after retry');
        }
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