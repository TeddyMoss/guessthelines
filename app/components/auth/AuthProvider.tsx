"use client";

import { Amplify } from 'aws-amplify';

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_AWS_REGION || 
    !process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 
    !process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
  console.error('Missing AWS configuration');
}

// Configure Amplify
Amplify.configure({
  Auth: {
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    userPoolWebClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    signUpVerificationMethod: 'code'
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