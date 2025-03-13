import { NextResponse } from 'next/server';

export async function middleware(req) {
  const url = req.nextUrl;

  if (url.pathname.startsWith('/api/social')) {
    // Rewrite /api/social/* to match backend's /api/*
    const newPath = url.pathname.replace('/api/social', '/api'); 
    const targetUrl = `https://social-media-integration-livid.vercel.app${newPath}${url.search}`;

    const fetchOptions = {
      method: req.method,
      headers: req.headers, // Forward headers
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined, // Forward body if needed
    };

    const response = await fetch(targetUrl, fetchOptions);

    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }

  return NextResponse.next();
}
