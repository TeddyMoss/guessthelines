"use client";

import { Amplify } from 'aws-amplify';

const region = process.env.NEXT_PUBLIC_AWS_REGION;
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

if (!region || !userPoolId || !userPoolClientId) {
  throw new Error('Missing required Cognito configuration');
}

console.log('Auth Config:', { region, userPoolId, userPoolClientId });

Amplify.configure({
  Auth: {
    Cognito: {
      region,
      userPoolId,
      userPoolClientId,
      signUpVerificationMethod: 'code'
    }
  }
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}