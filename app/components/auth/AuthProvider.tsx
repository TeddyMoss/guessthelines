"use client";

import { Amplify } from 'aws-amplify';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, fetchAuthSession, signInWithRedirect, type AuthUser } from 'aws-amplify/auth';

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

// Configure Amplify Auth
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      identityPoolId,
      region,
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
        phone: false,
        username: false
      }
    }
  }
}, {
  ssr: true
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
      const currentUser = await getCurrentUser();
      console.log('Current user:', currentUser);
      
      // Fetch and verify the auth session
      const session = await fetchAuthSession();
      console.log('Auth session details:', {
        hasSession: !!session,
        hasCredentials: !!session?.credentials,
        identityId: session?.identityId,
        accessKeyId: session?.credentials?.accessKeyId ? 'present' : 'missing',
        secretAccessKey: session?.credentials?.secretAccessKey ? 'present' : 'missing',
        sessionToken: session?.credentials?.sessionToken ? 'present' : 'missing'
      });

      if (!session?.credentials?.accessKeyId || !session?.credentials?.secretAccessKey) {
        throw new Error('No credentials available');
      }
      
      setUser(currentUser);
      setError(null);
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error('Failed to authenticate'));
      }
      // Attempt to clear any stale state
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