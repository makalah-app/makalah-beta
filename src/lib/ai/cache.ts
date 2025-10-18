import { cached as baseCached, createCacheBackend, MemoryCacheStore } from '@ai-sdk-tools/cache';
import type { CacheOptions, CacheStore, CachedTool } from '@ai-sdk-tools/cache';
import type { Tool } from 'ai';
import { redisManager, TTL_STRATEGIES } from '@/lib/config/redis-config';
import { performanceMonitorManager } from '@/lib/caching/performance-monitoring';

type CacheScope = 'smart-title' | 'artifact' | 'search' | 'default';

const MEMORY_MAX_SIZE = 500;
const HASH_SEED = 1315423911;

let sharedStore: CacheStore | null = null;

interface MakalahCacheOptions extends CacheOptions {
  scope?: CacheScope;
  metricsId?: string;
}

const scopeTtlMap: Record<CacheScope, number> = {
  'smart-title': 6 * 60 * 60 * 1000, // 6h
  artifact: (TTL_STRATEGIES.SESSION ?? 24 * 60 * 60) * 1000,
  search: (TTL_STRATEGIES.TEMPORARY ?? 10 * 60) * 1000,
  default: 5 * 60 * 1000,
};

function ensureStore(): CacheStore {
  if (sharedStore) return sharedStore;

  const hasRedisEnv =
    Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

  if (hasRedisEnv) {
    try {
      const healthy = redisManager.isRedisHealthy();
      if (!healthy) {
        void redisManager.performHealthCheck();
      }

      if (healthy || redisManager.isRedisHealthy()) {
        sharedStore = createCacheBackend({
          type: 'redis',
          redis: {
            client: redisManager.getClient(),
            keyPrefix: 'makalah:tool:',
          },
          defaultTTL: scopeTtlMap.default,
        });
        return sharedStore;
      }
    } catch (error) {
      sharedStore = null;
    }
  }

  sharedStore = new MemoryCacheStore(MEMORY_MAX_SIZE);
  return sharedStore;
}

function resolveTtl(scope: CacheScope | undefined, customTtl?: number): number {
  if (typeof customTtl === 'number') {
    return customTtl;
  }
  return scope ? scopeTtlMap[scope] ?? scopeTtlMap.default : scopeTtlMap.default;
}

function hashPayload(value: unknown): string {
  const input = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  let hash = HASH_SEED;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= (hash << 5) + input.charCodeAt(i) + (hash >> 2);
  }
  return Math.abs(hash >>> 0).toString(16);
}

function emitMetric(operation: string, hit: boolean): void {
  performanceMonitorManager.recordCacheOperation(
    operation,
    hit,
    0,
    false
  );
}

export function getCacheStore(): CacheStore {
  return ensureStore();
}

export function cachedTool<T extends Tool>(
  tool: T,
  options: MakalahCacheOptions = {}
): CachedTool {
  const {
    scope = 'default',
    metricsId,
    ttl,
    store,
    keyGenerator,
    onHit,
    onMiss,
    ...rest
  } = options;

  const cacheStore = store ?? ensureStore();
  const instrumentId = metricsId ?? (tool as any)?.name ?? tool.description ?? 'anonymous-tool';

  const scopedKeyGenerator =
    keyGenerator ??
    ((params: unknown) => {
      const baseKey = hashPayload(params);
      return `${scope}:${baseKey}`;
    });

  const scopedOnHit = (key: string) => {
    emitMetric(instrumentId, true);
    onHit?.(key);
  };

  const scopedOnMiss = (key: string) => {
    emitMetric(instrumentId, false);
    onMiss?.(key);
  };

  return baseCached(tool, {
    ...rest,
    ttl: resolveTtl(scope, ttl),
    store: cacheStore,
    keyGenerator: scopedKeyGenerator,
    onHit: scopedOnHit,
    onMiss: scopedOnMiss,
  });
}

export type { MakalahCacheOptions, CacheScope };
