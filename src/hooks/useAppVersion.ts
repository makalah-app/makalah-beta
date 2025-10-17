'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UseAppVersionOptions = {
  ttlMs?: number;
  persist?: boolean;
};

type UseAppVersionResult = {
  version: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DEFAULT_FALLBACK_VERSION = 'Beta 0.1';
const PERSIST_KEY = 'appVersion:lastKnown';

type Cache = {
  value?: string;
  ts?: number;
  promise: Promise<string> | null;
};

const cache: Cache = {
  value: undefined,
  ts: 0,
  promise: null,
};

async function fetchVersionFromServer(): Promise<string> {
  try {
    // Biarkan server-side cache (revalidate) bekerja; jangan pakai no-store di sini.
    const res = await fetch('/api/public/app-version');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const v = (data && data.version) || DEFAULT_FALLBACK_VERSION;
    return typeof v === 'string' && v.length > 0 ? v : DEFAULT_FALLBACK_VERSION;
  } catch {
    return DEFAULT_FALLBACK_VERSION;
  }
}

function getPersisted(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(PERSIST_KEY);
    return raw || null;
  } catch {
    return null;
  }
}

function setPersisted(v: string) {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(PERSIST_KEY, v);
  } catch {
    // ignore
  }
}

export function useAppVersion(options: UseAppVersionOptions = {}): UseAppVersionResult {
  const { ttlMs, persist } = options;
  const mountedRef = useRef(false);
  const [version, setVersion] = useState<string>(() => {
    // Initial value: cache > persisted > empty (biar UI bisa tampil "Memuat...")
    if (cache.value) return cache.value;
    const persisted = persist ? getPersisted() : null;
    return persisted || '';
  });
  const [loading, setLoading] = useState<boolean>(!Boolean(cache.value));
  const [error, setError] = useState<string | null>(null);

  const shouldRefresh = (): boolean => {
    if (!ttlMs) return !cache.value; // tanpa TTL, refresh hanya jika cache kosong
    const now = Date.now();
    const ts = cache.ts || 0;
    return now - ts > ttlMs;
  };

  const ensureFetch = useCallback(async () => {
    if (cache.promise) {
      // dedupe concurrent
      const v = await cache.promise;
      return v;
    }
    cache.promise = (async () => {
      const v = await fetchVersionFromServer();
      cache.value = v;
      cache.ts = Date.now();
      cache.promise = null;
      if (persist) setPersisted(v);
      return v;
    })();
    const v = await cache.promise;
    return v;
  }, [persist]);

  useEffect(() => {
    mountedRef.current = true;
    // Listen to client-wide update event to sync immediately without extra fetch
    const onUpdated = (evt: Event) => {
      try {
        const ce = evt as CustomEvent<{ version?: string }>;
        const v = ce?.detail?.version;
        if (typeof v === 'string' && v.length > 0) {
          cache.value = v;
          cache.ts = Date.now();
          if (persist) setPersisted(v);
          if (mountedRef.current) {
            setVersion(v);
            setLoading(false);
            setError(null);
          }
        }
      } catch {
        // ignore
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('app-version:updated', onUpdated as EventListener);
    }
    (async () => {
      if (shouldRefresh()) {
        setLoading(true);
        setError(null);
        const v = await ensureFetch();
        if (mountedRef.current) {
          setVersion(v);
          setLoading(false);
        }
      } else if (cache.value && version !== cache.value) {
        // Sinkronkan state dari cache jika ada
        setVersion(cache.value);
        setLoading(false);
      } else {
        setLoading(false);
      }
    })();
    return () => {
      mountedRef.current = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('app-version:updated', onUpdated as EventListener);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttlMs, ensureFetch]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Force fresh request bypass TTL: set promise baru
      cache.promise = (async () => {
        const v = await fetchVersionFromServer();
        cache.value = v;
        cache.ts = Date.now();
        cache.promise = null;
        if (persist) setPersisted(v);
        return v;
      })();
      const v = await cache.promise;
      if (mountedRef.current) setVersion(v);
    } catch (e: any) {
      if (mountedRef.current) setError(e?.message || 'Failed to refresh version');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [persist]);

  return { version, loading, error, refresh };
}
