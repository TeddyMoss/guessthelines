// lib/authConfig.ts

import { Amplify } from 'aws-amplify';

if (!Amplify.getConfig()) {
  try {
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
  } catch (error) {
    console.error('Error configuring Amplify:', error);
  }
}

export {};