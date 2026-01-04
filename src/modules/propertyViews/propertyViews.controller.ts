import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../../db';
import { propertyViews, properties } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export const propertyViewsController = {
  // Track property view
  trackView: async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const userId = req.user?.id;

      console.log('Track view request:', { propertyId, userId, ip: req.ip });

      // Insert view record
      await db.insert(propertyViews).values({
        id: randomUUID(),
        propertyId: propertyId,
        userId: userId || null,
        viewedAt: new Date(),
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      });

      // Increment view count in properties table
      await db
        .update(properties)
        .set({
          viewCount: sql`${properties.viewCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, propertyId));

      res.json({
        success: true,
        message: 'Property view tracked successfully'
      });
    } catch (error) {
      console.error('Track property view error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track property view',
        details: (error as Error).message
      });
    }
  },

  // Get property view stats
  getViewStats: async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;

      // Get view count and recent views
      const views = await db.select()
        .from(propertyViews)
        .where(eq(propertyViews.propertyId, propertyId))
        .orderBy(desc(propertyViews.viewedAt));

      const totalViews = views.length;
      const uniqueViews = new Set(views.map(v => v.userId || v.ipAddress)).size;

      res.json({
        success: true,
        data: {
          totalViews,
          uniqueViews,
          recentViews: views.slice(0, 10)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get view stats'
      });
    }
  },

  // Get recently viewed properties for a user
  getRecentlyViewed: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const recentViews = await db
        .select({
          id: properties.id,
          title: properties.title,
          price: properties.price,
          images: properties.images,
          city: properties.city,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          viewCount: properties.viewCount,
          viewedAt: propertyViews.viewedAt,
        })
        .from(propertyViews)
        .innerJoin(properties, eq(propertyViews.propertyId, properties.id))
        .where(eq(propertyViews.userId, userId))
        .orderBy(desc(propertyViews.viewedAt))
        .limit(limit);

      res.json({
        success: true,
        data: recentViews,
      });
    } catch (error) {
      console.error('Error fetching recently viewed properties:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recently viewed properties',
      });
    }
  },
};
