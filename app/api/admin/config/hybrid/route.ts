/**
 * DEPRECATED ENDPOINT - HYBRID SYSTEM REMOVED
 * 
 * This endpoint has been disabled as part of simplification.
 * Use /api/admin/config instead for model configuration.
 * 
 * Hybrid provider complexity has been replaced with simple Primary/Fallback architecture.
 */

import { NextRequest, NextResponse } from 'next/server';

// Return deprecation notice for all methods
const deprecatedResponse = {
  success: false,
  error: {
    code: 'ENDPOINT_DEPRECATED',
    message: 'Hybrid configuration endpoint has been deprecated. Use /api/admin/config instead.',
    details: 'Hybrid provider system has been simplified to Primary/Fallback architecture.'
  }
};

export async function GET(request: NextRequest) {
  console.log('⚠️ Deprecated hybrid endpoint called - returning error');
  return NextResponse.json(deprecatedResponse, { status: 410 }); // 410 Gone
}

export async function POST(request: NextRequest) {
  console.log('⚠️ Deprecated hybrid endpoint called - returning error');
  return NextResponse.json(deprecatedResponse, { status: 410 }); // 410 Gone
}

export async function PUT(request: NextRequest) {
  console.log('⚠️ Deprecated hybrid endpoint called - returning error');
  return NextResponse.json(deprecatedResponse, { status: 410 }); // 410 Gone
}

export async function DELETE(request: NextRequest) {
  console.log('⚠️ Deprecated hybrid endpoint called - returning error');
  return NextResponse.json(deprecatedResponse, { status: 410 }); // 410 Gone
}