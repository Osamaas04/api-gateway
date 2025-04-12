import { NextResponse } from 'next/server';

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

  if (url.pathname.startsWith('/api/social')) {
    targetUrl = `https://social.replix.space${url.pathname.replace('/api/social', '/api')}${url.search}`;
  } else if (url.pathname.startsWith('/api/account')) {
    targetUrl = `http://replix.runasp.net${url.pathname.replace('/api/account', '/account')}${url.search}`;
  }

  if (!targetUrl) {
    return NextResponse.next();
  }

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