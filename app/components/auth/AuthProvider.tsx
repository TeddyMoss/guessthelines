"use client";

import { Amplify } from 'aws-amplify';

const region = process.env.NEXT_PUBLIC_AWS_REGION;
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

if (!region || !userPoolId || !userPoolClientId) {
  throw new Error('Missing required environment variables for Amplify configuration');
}

Amplify.configure({
  Auth: {
    Cognito: {
      region,
      userPoolId,
      userPoolClientId
    }
  }
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}