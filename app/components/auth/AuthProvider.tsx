// app/components/auth/AuthProvider.tsx
"use client";

import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
    }
  }
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}