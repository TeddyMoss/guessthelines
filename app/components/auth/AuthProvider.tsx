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
    }
  },
  // Required AWS configuration
  aws_project_region: region,
  aws_cognito_region: region,
  aws_user_pools_id: userPoolId,
  aws_user_pools_web_client_id: userPoolClientId,
  aws_cognito_identity_pool_id: identityPoolId,
  aws_mandatory_sign_in: false,
  aws_cognito_authentication_type: 'USER_SRP',
  aws_cognito_signup_attributes: ['email'],
  aws_cognito_mfa_configuration: 'OFF',
  aws_cognito_password_protection_settings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: []
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
      const currentUser = await getCurrentUser();
      console.log('Current user:', currentUser);
      
      // Verify credentials
      const session = await fetchAuthSession();
      console.log('Auth session credentials:', {
        hasCredentials: !!session.credentials,
        identityId: session.identityId
      });

      if (!session.credentials) {
        throw new Error('No credentials available');
      }
      
      setUser(currentUser);
      setError(null);
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
      setError(err instanceof Error ? err : new Error('Authentication error'));
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