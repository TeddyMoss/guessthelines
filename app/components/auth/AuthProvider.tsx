"use client";

import { Amplify } from 'aws-amplify';

console.log('Auth Config:', {
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
});

Amplify.configure({
  Auth: {
    Cognito: {
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      signUpVerificationMethod: 'code'
    }
  }
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}