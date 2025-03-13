import { NextResponse } from 'next/server';

export async function middleware(req) {
  const url = req.nextUrl;

  // Handle OPTIONS (Preflight) Requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      headers: {
        'Access-Control-Allow-Origin': 'https://replix-livid.vercel.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (url.pathname.startsWith('/api/social')) {
    const newPath = url.pathname.replace('/api/social', '/api');
    const targetUrl = `https://social-media-integration-livid.vercel.app${newPath}${url.search}`;

    const fetchOptions = {
      method: req.method,
      headers: { ...req.headers, Host: 'social-media-integration-livid.vercel.app' }, // Adjust headers if needed
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
      credentials: 'include', // Include cookies if needed
    };

    // Remove sensitive headers from forwarding
    delete fetchOptions.headers['content-length'];
    delete fetchOptions.headers['host'];

    try {
      const response = await fetch(targetUrl, fetchOptions);
      const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://replix-livid.vercel.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

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

  return NextResponse.next();
}
