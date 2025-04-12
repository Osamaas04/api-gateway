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

  const fetchOptions = {
    method: req.method,
    headers: { ...req.headers, Host: new URL(targetUrl).host },
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
  };

  delete fetchOptions.headers['content-length'];
  delete fetchOptions.headers['host'];

  try {
    const proxyResponse = await fetch(targetUrl, fetchOptions);

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