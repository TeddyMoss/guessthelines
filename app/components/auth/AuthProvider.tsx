"use client";

import { Amplify } from 'aws-amplify';

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

if (!userPoolId || !userPoolClientId) {
  throw new Error('Missing required Cognito configuration');
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,        // TypeScript now knows these can't be undefined
      userPoolClientId,  // because of the check above
      loginWith: {
        email: true,
        phone: false,
        username: false
      }
    }
  }
});

// Debug log to check environment variables
console.log('ENV:', {
  userPoolId,
  userPoolClientId
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}