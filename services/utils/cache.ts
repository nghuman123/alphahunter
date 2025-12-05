
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.resolve(process.cwd(), '.cache');

interface CacheEntry<T> {
    data: T;
    expiresAt: number; // Unix timestamp in seconds
    createdAt: number; // Unix timestamp in seconds
    ticker?: string;
    endpoint?: string;
}

// Ensure cache directory exists
const ensureCacheDir = async () => {
    try {
        await fs.access(CACHE_DIR);
    } catch {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    }
};

// Generate a safe filename from a key
const getCacheFilePath = (key: string) => {
    // Hash the key to avoid filesystem issues with long/invalid chars
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(CACHE_DIR, `${hash}.json`);
};

export const getCache = async <T>(key: string): Promise<T | null> => {
    await ensureCacheDir();
    const filePath = getCacheFilePath(key);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const entry: CacheEntry<T> = JSON.parse(content);

        // Check expiration (seconds)
        if (Date.now() / 1000 > entry.expiresAt) {
            // Expired, delete it (fire and forget)
            fs.unlink(filePath).catch(() => { });
            return null;
        }

        // console.log(`[Cache] HIT: ${key}`); // Optional verbose logging
        return entry.data;
    } catch (err) {
        // File not found or corrupt
        return null;
    }
};

export const setCache = async <T>(key: string, data: T, ttlSeconds: number, metadata?: { ticker?: string; endpoint?: string }): Promise<void> => {
    await ensureCacheDir();
    const filePath = getCacheFilePath(key);

    const now = Math.floor(Date.now() / 1000);
    const entry: CacheEntry<T> = {
        data,
        expiresAt: now + ttlSeconds,
        createdAt: now,
        ticker: metadata?.ticker,
        endpoint: metadata?.endpoint
    };

    try {
        await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
        // console.log(`[Cache] SET: ${key} (TTL: ${ttlSeconds}s)`); // Optional verbose logging
    } catch (err) {
        console.warn(`[Cache] Failed to write cache for key: ${key}`, err);
    }
};

export const getCacheStats = async (): Promise<{ total: number; valid: number; expired: number; sizeMB: string }> => {
    await ensureCacheDir();
    let total = 0;
    let valid = 0;
    let expired = 0;
    let totalSize = 0;

    try {
        const files = await fs.readdir(CACHE_DIR);
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            total++;
            const filePath = path.join(CACHE_DIR, file);
            try {
                const stats = await fs.stat(filePath);
                totalSize += stats.size;

                const content = await fs.readFile(filePath, 'utf-8');
                const entry: CacheEntry<any> = JSON.parse(content);
                if (Date.now() / 1000 > entry.expiresAt) {
                    expired++;
                } else {
                    valid++;
                }
            } catch {
                // Ignore corrupt files
            }
        }
    } catch (err) {
        console.error('[Cache] Failed to get stats', err);
    }

    return {
        total,
        valid,
        expired,
        sizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
};

export const clearCache = async (): Promise<void> => {
    try {
        await fs.rm(CACHE_DIR, { recursive: true, force: true });
        await ensureCacheDir();
    } catch (err) {
        console.error('[Cache] Failed to clear cache', err);
    }
};
