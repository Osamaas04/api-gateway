import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function middleware(req) {
  const url = req.nextUrl;
  const { pathname } = url;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://replix.space',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  // PUBLIC ROUTES — skip token validation
  const publicPaths = [
    '/api/account/login',
    '/api/account/register',
    '/api/account/forgot-password',
    '/api/account/reset-password',
    '/api/social/createUserId',
  ];

  const isPublicRoute = publicPaths.some(path => pathname.startsWith(path));

  let targetUrl = null;

  if (pathname.startsWith('/api/social')) {
    targetUrl = `https://social.replix.space${pathname.replace('/api/social', '/api')}${url.search}`;
  } else if (pathname.startsWith('/api/account')) {
    targetUrl = `http://replix.runasp.net${pathname.replace('/api/account', '/account')}${url.search}`;
  }

  if (!targetUrl) {
    return NextResponse.next();
  }

  // 🔒 AUTH CHECK (only for protected routes)
  if (!isPublicRoute) {
    const cookie = req.headers.get('cookie') || '';
    const token = cookie
      .split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized: No token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.log(process.env.JWT_SECRET)
    try {
      const decoded = jwt.decode(token);
      req.headers.set('x-user-id', decoded.sub);
    } catch (err) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Prepare headers for proxy
  const headers = {};
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
      headers[key] = value;
    }
  });

  headers['host'] = new URL(targetUrl).host;

  // Handle request body
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

    const response = new NextResponse(proxyResponse.body, {
      status: proxyResponse.status,
      headers: proxyResponse.headers,
    });

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
