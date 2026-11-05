// =============================================================================
// QueueCare: Centralized Redis Caching Service
// Connects via ioredis with cache-aside helpers, namespace keys, TTL management,
// invalidation hooks, metrics observability, and transparent offline fallback.
// =============================================================================

import Redis from "ioredis";

export interface CacheMetrics {
  connected: boolean;
  hits: number;
  misses: number;
  writes: number;
  errors: number;
  lastError: string | null;
  hitRatioPercent: number;
}

const metrics: CacheMetrics = {
  connected: false,
  hits: 0,
  misses: 0,
  writes: 0,
  errors: 0,
  lastError: null,
  hitRatioPercent: 0,
};

let redisClient: Redis | null = null;
let isConnecting = false;

// Standard Cache Namespaces & TTLs (in seconds)
export const CACHE_KEYS = {
  DEPARTMENTS: "queuecare:departments",
  DOCTORS_LIST: "queuecare:doctors:list",
  STATS_SUMMARY: "queuecare:stats:summary",
  RECOMMENDATIONS_PREFIX: "queuecare:rec:",
};

export const CACHE_TTL = {
  SHORT: 30,         // 30 seconds for live summary metrics
  MEDIUM: 120,       // 2 minutes for recommendations
  LONG: 600,         // 10 minutes for static directories (departments, doctors)
};

function updateHitRatio() {
  const total = metrics.hits + metrics.misses;
  metrics.hitRatioPercent = total > 0 ? Math.round((metrics.hits / total) * 100) : 0;
}

/**
 * Initializes and retrieves the singleton Redis client
 */
export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  if (isConnecting) return null;

  try {
    isConnecting = true;
    const client = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: false,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 500, 2000);
      },
    });

    client.on("connect", () => {
      metrics.connected = true;
      metrics.lastError = null;
    });

    client.on("error", (err) => {
      metrics.connected = false;
      metrics.errors++;
      metrics.lastError = err.message;
    });

    client.on("close", () => {
      metrics.connected = false;
    });

    redisClient = client;
    isConnecting = false;
    return redisClient;
  } catch (err) {
    isConnecting = false;
    metrics.connected = false;
    metrics.errors++;
    metrics.lastError = (err as Error).message;
    return null;
  }
}

/**
 * Retrieves a cached value or returns null if not found/cache offline
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client || !metrics.connected) {
    metrics.misses++;
    updateHitRatio();
    return null;
  }

  try {
    const raw = await client.get(key);
    if (raw) {
      metrics.hits++;
      updateHitRatio();
      return JSON.parse(raw) as T;
    }
    metrics.misses++;
    updateHitRatio();
    return null;
  } catch (err) {
    metrics.errors++;
    metrics.lastError = (err as Error).message;
    metrics.misses++;
    updateHitRatio();
    return null;
  }
}

/**
 * Sets a cached value with TTL in seconds
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds = CACHE_TTL.MEDIUM): Promise<void> {
  const client = getRedisClient();
  if (!client || !metrics.connected) return;

  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    metrics.writes++;
  } catch (err) {
    metrics.errors++;
    metrics.lastError = (err as Error).message;
  }
}

/**
 * Deletes a single key or pattern from cache
 */
export async function cacheDel(keyOrPattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client || !metrics.connected) return;

  try {
    if (keyOrPattern.includes("*")) {
      const keys = await client.keys(keyOrPattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } else {
      await client.del(keyOrPattern);
    }
  } catch (err) {
    metrics.errors++;
    metrics.lastError = (err as Error).message;
  }
}

export const invalidateCacheKey = cacheDel;

/**
 * Cache-Aside read helper:
 * 1. Checks cache
 * 2. On miss, executes fetcher()
 * 3. Saves to cache with TTL
 * 4. Returns data transparently
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = CACHE_TTL.MEDIUM
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

/**
 * Returns current cache metrics for Admin Observability Dashboard
 */
export async function getCacheMetrics(): Promise<CacheMetrics> {
  const client = getRedisClient();
  if (client) {
    try {
      const pong = await client.ping();
      metrics.connected = (pong === "PONG");
    } catch {
      metrics.connected = false;
    }
  }
  return { ...metrics };
}

/**
 * Resets/flushes all QueueCare namespaced cache keys
 */
export async function flushQueueCareCache(): Promise<number> {
  const client = getRedisClient();
  if (!client || !metrics.connected) return 0;

  try {
    const keys = await client.keys("queuecare:*");
    if (keys.length > 0) {
      await client.del(...keys);
      return keys.length;
    }
    return 0;
  } catch {
    return 0;
  }
}

