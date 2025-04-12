import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function middleware(req) {
  const url = req.nextUrl;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://frontend.replix.space',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  let targetUrl = null;

  // Define which target URLs to proxy
  if (url.pathname.startsWith('/api/social')) {
    targetUrl = `https://social.replix.space${url.pathname.replace('/api/social', '/api')}${url.search}`;
  } else if (url.pathname.startsWith('/api/account')) {
    targetUrl = `http://replix.runasp.net${url.pathname.replace('/api/account', '/account')}${url.search}`;
  }

  if (!targetUrl) {
    return NextResponse.next();
  }

  // Extract and verify token
  const cookie = req.headers.get('cookie') || '';
  const token = cookie
    .split(';')
    .find(c => c.trim().startsWith('token='))
    ?.split('=')[1];

  // If token is missing, reject the request immediately
  if (!token) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized: No token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let userPayload;
  try {
    // Verify JWT token
    userPayload = jwt.verify(token, process.env.JWT_SECRET); // Use your secret key or public key for verification
  } catch (err) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Attach user data to request headers for downstream services
  req.headers.set('x-user-id', userPayload.sub);  // Assuming 'sub' is the user ID from the token payload

  // Extract and reformat headers
  const headers = {};
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
      headers[key] = value;
    }
  });

  headers['host'] = new URL(targetUrl).host;

  // Handle body depending on content-type
  const contentType = req.headers.get('content-type') || '';
  let body;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (contentType.includes('application/json')) {
      const json = await req.json();
      body = JSON.stringify(json);
    } else {
      body = await req.text();
    }
  }

  try {
    const proxyResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    // Build the response
    const response = new NextResponse(proxyResponse.body, {
      status: proxyResponse.status,
      headers: proxyResponse.headers,
    });

    // Append CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: 'Backend unreachable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
