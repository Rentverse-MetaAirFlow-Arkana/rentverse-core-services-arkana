import { cache } from './cache';
import { Request, Response } from 'express';

/**
 * Cache wrapper for GET endpoints
 */
export const withCache = (
  cacheKeyPrefix: string,
  ttlSeconds: number = 1800, // 30 minutes default
  keyGenerator?: (req: Request) => string
) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = async function(req: Request, res: Response) {
      try {
        // Generate cache key
        const defaultKey = keyGenerator 
          ? keyGenerator(req)
          : `${cacheKeyPrefix}:${JSON.stringify({ 
              ...req.query, 
              ...req.params,
              userId: req.user?.id 
            })}`;

        // Check cache first
        const cachedData = cache.get(defaultKey);
        if (cachedData) {
          return res.json({
            ...cachedData,
            message: cachedData.message ? `${cachedData.message} (cached)` : 'Data retrieved successfully (cached)'
          });
        }

        // Store original res.json to intercept response
        const originalJson = res.json;
        let responseData: any;

        res.json = function(data: any) {
          responseData = data;
          return originalJson.call(this, data);
        };

        // Call original method
        await method.call(this, req, res);

        // Cache successful responses
        if (responseData && responseData.success !== false && res.statusCode < 400) {
          cache.set(defaultKey, responseData, ttlSeconds);
        }

      } catch (error) {
        // Call original method on error
        return method.call(this, req, res);
      }
    };

    return descriptor;
  };
};

/**
 * Quick cache decorators for common use cases
 */
export const CacheShort = withCache('short', 900); // 15 minutes
export const CacheMedium = withCache('medium', 1800); // 30 minutes  
export const CacheLong = withCache('long', 3600); // 1 hour
export const CacheVeryLong = withCache('very-long', 7200); // 2 hours
