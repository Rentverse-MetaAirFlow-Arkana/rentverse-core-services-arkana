interface CacheItem {
  data: any;
  timestamp: number;
}

class MemoryCache {
  private cache: Map<string, CacheItem> = new Map();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();

// Run cleanup every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);
