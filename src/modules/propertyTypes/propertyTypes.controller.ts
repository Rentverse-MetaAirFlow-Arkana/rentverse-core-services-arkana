import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../../config/database';
import { propertyTypes } from '../../db/schema';
import { eq, like, desc, count, and } from 'drizzle-orm';
import { ApiResponse, PaginatedResponse, NewPropertyType } from '../../types';
import { cache } from '../../utils/cache';

class PropertyTypesController {
  /**
   * Get all property types
   */
  async getAllPropertyTypes(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Create cache key
      const cacheKey = `property-types:${JSON.stringify({ page, limit, search })}`;
      
      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        res.json({
          ...cachedData,
          message: 'Property types retrieved successfully (cached)'
        });
        return;
      }

      // Build where conditions
      const conditions = [];

      if (search) {
        conditions.push(like(propertyTypes.name, `%${search}%`));
      }

      // Get property types
      const propertyTypesData = await db
        .select()
        .from(propertyTypes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(propertyTypes.createdAt))
        .limit(Number(limit))
        .offset(offset);

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(propertyTypes)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult.count;
      const totalPages = Math.ceil(total / Number(limit));

      const response: PaginatedResponse = {
        success: true,
        data: propertyTypesData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
        },
      };

      // Cache the result for 2 hours
      cache.set(cacheKey, response, 7200);

      res.json(response);
    } catch (error) {
      console.error('Get property types error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch property types',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get property type by ID
   */
  async getPropertyTypeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const [propertyType] = await db
        .select()
        .from(propertyTypes)
        .where(eq(propertyTypes.id, id))
        .limit(1);

      if (!propertyType) {
        res.status(404).json({
          success: false,
          error: 'Property type not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: propertyType,
      };

      res.json(response);
    } catch (error) {
      console.error('Get property type error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch property type',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Create new property type (Admin only)
   */
  async createPropertyType(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const propertyTypeData: NewPropertyType = {
        id: randomUUID(),
        ...req.body,
        createdAt: now,
        updatedAt: now,
      };

      const [newPropertyType] = await db
        .insert(propertyTypes)
        .values(propertyTypeData)
        .returning();

      const response: ApiResponse = {
        success: true,
        message: 'Property type created successfully',
        data: newPropertyType,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create property type error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create property type',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Update property type (Admin only)
   */
  async updatePropertyType(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const [updatedPropertyType] = await db
        .update(propertyTypes)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(propertyTypes.id, id))
        .returning();

      if (!updatedPropertyType) {
        res.status(404).json({
          success: false,
          error: 'Property type not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Property type updated successfully',
        data: updatedPropertyType,
      };

      res.json(response);
    } catch (error) {
      console.error('Update property type error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update property type',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Delete property type (Admin only)
   */
  async deletePropertyType(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const [deletedPropertyType] = await db
        .delete(propertyTypes)
        .where(eq(propertyTypes.id, id))
        .returning();

      if (!deletedPropertyType) {
        res.status(404).json({
          success: false,
          error: 'Property type not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Property type deleted successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Delete property type error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete property type',
        message: (error as Error).message,
      });
    }
  }
}

export default new PropertyTypesController();
