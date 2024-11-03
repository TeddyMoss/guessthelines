"use client";

import { Amplify } from 'aws-amplify';

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const region = process.env.NEXT_PUBLIC_AWS_REGION;

if (!userPoolId || !userPoolClientId || !region) {
  throw new Error('Missing required Cognito configuration');
}

// Debug what values we actually have
console.log('Amplify Config Values:', {
  region,
  userPoolId,
  userPoolClientId
});

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        email: true,
        username: true
      }
    },
    region
  }
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Add debug output to see if component renders */}
      <div style={{ display: 'none' }}>
        Auth Provider Loaded: {userPoolId}
      </div>
      {children}
    </>
  );
}