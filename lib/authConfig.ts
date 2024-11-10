// lib/authConfig.ts

import { Amplify } from 'aws-amplify';

console.log('Starting Amplify configuration...', {
  hasUserPoolId: !!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  hasClientId: !!process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  hasRegion: !!process.env.NEXT_PUBLIC_AWS_REGION,
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  region: process.env.NEXT_PUBLIC_AWS_REGION
});

const config = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      region: process.env.NEXT_PUBLIC_AWS_REGION!
    }
  }
};

try {
  Amplify.configure(config);
  console.log('Amplify configured successfully');
} catch (error) {
  console.error('Error configuring Amplify:', error);
}