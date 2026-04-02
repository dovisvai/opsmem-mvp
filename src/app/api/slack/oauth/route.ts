import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ success: false, message: 'OAuth installation failed or was denied.', error });
  }

  if (!code) {
    return NextResponse.json({ success: false, message: 'No OAuth code provided.' });
  }

  // Future implementation: exchange the code for an access token via WebClient
  // const client = new WebClient();
  // const response = await client.oauth.v2.access({ ... });

  return NextResponse.json({ 
    success: true, 
    message: 'OAuth complete! The OpsMem app is installed. (We received the code but full exchange implementation is pending MVP scaling.)' 
  });
}
