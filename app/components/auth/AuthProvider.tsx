"use client";

import { Amplify } from 'aws-amplify';

if (!process.env.NEXT_PUBLIC_AWS_REGION || 
    !process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 
    !process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
  console.error('Missing AWS configuration');
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
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
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}