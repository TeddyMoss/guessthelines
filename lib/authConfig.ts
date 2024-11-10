// lib/authConfig.ts

import { Amplify } from 'aws-amplify';

if (!Amplify.getConfig()) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
        region: process.env.NEXT_PUBLIC_AWS_REGION!,
        signUpVerificationMethod: 'code',
        authenticationFlowType: 'USER_SRP_AUTH',
        loginWith: {
          email: true,
          phone: false,
          username: false
        }
      }
    }
  });

  console.log('Amplify configured with:', {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    region: process.env.NEXT_PUBLIC_AWS_REGION
  });
}