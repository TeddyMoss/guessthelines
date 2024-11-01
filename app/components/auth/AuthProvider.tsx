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
  aws_project_region: process.env.NEXT_PUBLIC_AWS_REGION,
  aws_cognito_region: process.env.NEXT_PUBLIC_AWS_REGION,
  aws_user_pools_id: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  aws_user_pools_web_client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  Auth: {
    Cognito: {
      allowGuestAccess: false,
      loginWith: {
        email: true,
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

// Component that wraps the app with Amplify configuration
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}