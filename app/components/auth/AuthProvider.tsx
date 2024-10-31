"use client";

import { Amplify } from 'aws-amplify';

if (!process.env.NEXT_PUBLIC_AWS_REGION ||
    !process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
    !process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
  throw new Error('Missing required environment variables for Amplify configuration');
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      signUpVerificationMethod: 'code'
    }
  }
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}