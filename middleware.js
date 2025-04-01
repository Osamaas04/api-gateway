import { NextResponse } from 'next/server';

export async function middleware(req) {
  const url = req.nextUrl;
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://replix-livid.vercel.app',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS (Preflight) Requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  let targetUrl = null;

  // Route for social media API
  if (url.pathname.startsWith('/api/social')) {
    targetUrl = `https://social-media-integration-livid.vercel.app${url.pathname.replace('/api/social', '/api')}${url.search}`;
  }
  // Route for account-related API (e.g., register, login, etc.)
  else if (url.pathname.startsWith('/api/account')) {
    targetUrl = `http://replix.runasp.net${url.pathname.replace('/api/account', '/account')}${url.search}`;
  }

  // If no matching route, continue to the next middleware
  if (!targetUrl) {
    return NextResponse.next();
  }

  const fetchOptions = {
    method: req.method,
    headers: {
      ...req.headers,
      Host: new URL(targetUrl).host,
      'Content-Type': req.headers.get('content-type') || 'application/json', // Default to JSON if missing
    },
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
  };

  // Remove sensitive headers from forwarding
  delete fetchOptions.headers['content-length'];
  delete fetchOptions.headers['host'];

  try {
    const response = await fetch(targetUrl, fetchOptions);

    return new NextResponse(response.body, {
      status: response.status,
      headers: { ...response.headers, ...corsHeaders },
    });
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: 'Backend unreachable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
