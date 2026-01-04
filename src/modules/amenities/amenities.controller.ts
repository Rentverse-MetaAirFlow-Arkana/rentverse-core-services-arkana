import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../../config/database';
import { amenities } from '../../db/schema';
import { eq, like, desc, count, and } from 'drizzle-orm';
import { ApiResponse, PaginatedResponse, NewAmenity } from '../../types';
import { cache } from '../../utils/cache';

class AmenitiesController {
  /**
   * Get all amenities
   */
  async getAllAmenities(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 50, search, category } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Create cache key
      const cacheKey = `amenities:${JSON.stringify({ page, limit, search, category })}`;
      
      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        res.json({
          ...cachedData,
          message: 'Amenities retrieved successfully (cached)'
        });
        return;
      }

      // Build where conditions
      const conditions = [];
      
      if (search) {
        conditions.push(like(amenities.name, `%${search}%`));
      }
      
      if (category) {
        conditions.push(eq(amenities.category, category as string));
      }

      // Get amenities
      const amenitiesData = await db
        .select()
        .from(amenities)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(amenities.name)
        .limit(Number(limit))
        .offset(offset);

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(amenities)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult.count;
      const totalPages = Math.ceil(total / Number(limit));

      const response: PaginatedResponse = {
        success: true,
        data: amenitiesData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
        },
      };

      // Cache the result for 1 hour
      cache.set(cacheKey, response, 3600);

      res.json(response);
    } catch (error) {
      console.error('Get amenities error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch amenities',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get amenity by ID
   */
  async getAmenityById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Create cache key
      const cacheKey = `amenity:${id}`;
      
      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        res.json({
          ...cachedData,
          message: 'Amenity retrieved successfully (cached)'
        });
        return;
      }

      const [amenity] = await db
        .select()
        .from(amenities)
        .where(eq(amenities.id, id))
        .limit(1);

      if (!amenity) {
        res.status(404).json({
          success: false,
          error: 'Amenity not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: amenity,
      };

      // Cache the result for 2 hours
      cache.set(cacheKey, response, 7200);

      res.json(response);
    } catch (error) {
      console.error('Get amenity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch amenity',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Create new amenity (Admin only)
   */
  async createAmenity(req: Request, res: Response): Promise<void> {
    try {
      const amenityData: NewAmenity = {
        id: randomUUID(),
        ...req.body,
      };

      const [newAmenity] = await db
        .insert(amenities)
        .values(amenityData)
        .returning();

      const response: ApiResponse = {
        success: true,
        message: 'Amenity created successfully',
        data: newAmenity,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create amenity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create amenity',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Update amenity (Admin only)
   */
  async updateAmenity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const [updatedAmenity] = await db
        .update(amenities)
        .set(updateData)
        .where(eq(amenities.id, id))
        .returning();

      if (!updatedAmenity) {
        res.status(404).json({
          success: false,
          error: 'Amenity not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Amenity updated successfully',
        data: updatedAmenity,
      };

      res.json(response);
    } catch (error) {
      console.error('Update amenity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update amenity',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Delete amenity (Admin only)
   */
  async deleteAmenity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const [deletedAmenity] = await db
        .delete(amenities)
        .where(eq(amenities.id, id))
        .returning();

      if (!deletedAmenity) {
        res.status(404).json({
          success: false,
          error: 'Amenity not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Amenity deleted successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Delete amenity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete amenity',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get amenity categories
   */
  async getAmenityCategories(req: Request, res: Response): Promise<void> {
    try {
      // Get distinct categories from amenities
      const categories = await db
        .selectDistinct({ category: amenities.category })
        .from(amenities)
        .where(eq(amenities.category, amenities.category)); // Filter out null categories

      const response: ApiResponse = {
        success: true,
        data: categories.map(c => c.category).filter(Boolean),
      };

      res.json(response);
    } catch (error) {
      console.error('Get amenity categories error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch amenity categories',
        message: (error as Error).message,
      });
    }
  }
}

export default new AmenitiesController();
