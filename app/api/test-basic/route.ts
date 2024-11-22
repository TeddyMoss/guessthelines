import { NextResponse } from 'next/server';

export async function GET() {
  console.log('Basic API Test Starting');
  
  try {
    // 1. Basic API Response
    const basicResponse = {
      status: 'API Route Working',
      timestamp: new Date().toISOString()
    };

    // 2. Environment Variables Check
    const envCheck = {
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      hasAmplifyKey: !!process.env.AMPLIFY_ACCESS_KEY_ID,
      hasAmplifySecret: !!process.env.AMPLIFY_SECRET_ACCESS_KEY,
      // Log lengths to verify format without exposing values
      keyLength: process.env.AMPLIFY_ACCESS_KEY_ID?.length,
      secretLength: process.env.AMPLIFY_SECRET_ACCESS_KEY?.length
    };

    return NextResponse.json({
      basicResponse,
      envCheck,
      success: true
    });
  } catch (error) {
    console.error('Basic Test Error:', error);
    return NextResponse.json({
      error: 'Basic test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
