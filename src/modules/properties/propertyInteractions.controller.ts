import { Request, Response } from 'express';
import { db } from '../../config/database';
import { propertyRatings, propertyFavorites, properties } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

class PropertyInteractionsController {
  async getNearbyProperties(req: Request, res: Response) {
    try {
      const { latitude, longitude, radius = 5, limit = 10 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      // TODO: Implement nearby properties logic
      res.json({
        success: true,
        message: 'Nearby properties retrieved successfully',
        data: []
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get nearby properties',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async addToFavorites(req: Request, res: Response) {
    try {
      const { propertyId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Check if property exists
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);

      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }

      // Check if already favorited
      const [existing] = await db
        .select()
        .from(propertyFavorites)
        .where(and(
          eq(propertyFavorites.propertyId, propertyId),
          eq(propertyFavorites.userId, userId)
        ))
        .limit(1);

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Property already in favorites'
        });
      }

      await db.insert(propertyFavorites).values({
        id: randomUUID(),
        propertyId,
        userId,
        favoritedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Property added to favorites'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to add property to favorites',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async removeFromFavorites(req: Request, res: Response) {
    try {
      const { propertyId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await db
        .delete(propertyFavorites)
        .where(and(
          eq(propertyFavorites.propertyId, propertyId),
          eq(propertyFavorites.userId, userId)
        ));

      res.json({
        success: true,
        message: 'Property removed from favorites'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to remove property from favorites',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async rateProperty(req: Request, res: Response) {
    try {
      const { propertyId } = req.params;
      const { rating, comment } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      // Check if property exists
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);

      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }

      // Check if user already rated this property
      const [existingRating] = await db
        .select()
        .from(propertyRatings)
        .where(and(
          eq(propertyRatings.propertyId, propertyId),
          eq(propertyRatings.userId, userId)
        ))
        .limit(1);

      if (existingRating) {
        // Update existing rating
        await db
          .update(propertyRatings)
          .set({
            rating: Number(rating),
            comment: comment || null,
            updatedAt: new Date()
          })
          .where(eq(propertyRatings.id, existingRating.id));

        return res.json({
          success: true,
          message: 'Property rating updated successfully'
        });
      } else {
        // Create new rating
        await db.insert(propertyRatings).values({
          id: randomUUID(),
          propertyId,
          userId,
          rating: Number(rating),
          comment: comment || null,
          ratedAt: new Date(),
          updatedAt: new Date()
        });

        return res.json({
          success: true,
          message: 'Property rated successfully'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to rate property',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new PropertyInteractionsController();
