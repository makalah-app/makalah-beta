'use client';

export type DebugPayload = {
  scope: string;
  message: string;
  data?: any;
};

export async function debugLog(scope: string, message: string, data?: any) {
  try {
    const payload: DebugPayload = { scope, message, data };
    await fetch('/api/debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        ts: new Date().toISOString(),
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      }),
      keepalive: true,
    });
  } catch {}
}

