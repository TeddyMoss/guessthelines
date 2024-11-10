// app/components/auth/AuthInitializer.tsx

'use client';

import { useEffect } from 'react';
import { Amplify } from 'aws-amplify';

export function AuthInitializer() {
  useEffect(() => {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
          userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
          region: process.env.NEXT_PUBLIC_AWS_REGION!,
          signUpVerificationMethod: 'code'
        }
      }
    });
    
    console.log('Auth configured on client:', {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      region: process.env.NEXT_PUBLIC_AWS_REGION
    });
  }, []);

  return null;
}