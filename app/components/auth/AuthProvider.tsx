"use client";

import { Amplify } from 'aws-amplify';

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const region = process.env.NEXT_PUBLIC_AWS_REGION;

if (!userPoolId || !userPoolClientId || !region) {
  throw new Error('Missing required Cognito configuration');
}

console.log('ENV:', {
  userPoolId,
  userPoolClientId
});

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId,
      userPoolId,
      signUpVerificationMethod: 'code',
    }
  }
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}