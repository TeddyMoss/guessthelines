"use client";

import { Amplify } from 'aws-amplify';
import { useEffect } from 'react';

Amplify.configure({
  aws_cognito_region: process.env.NEXT_PUBLIC_AWS_REGION,
  aws_user_pools_id: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  aws_user_pools_web_client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return children;
}