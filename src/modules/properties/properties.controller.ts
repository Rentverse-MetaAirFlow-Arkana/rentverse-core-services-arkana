import { Request, Response } from 'express';
import { PropertiesService } from './properties.service';
import { PropertyQuery } from '../../types';
import { cache } from '../../utils/cache';

class PropertiesController {
  private propertiesService: PropertiesService;

  constructor() {
    this.propertiesService = new PropertiesService();

    // Bind methods to preserve 'this' context
    this.getAllProperties = this.getAllProperties.bind(this);
    this.getPropertyById = this.getPropertyById.bind(this);
    this.createProperty = this.createProperty.bind(this);
    this.updateProperty = this.updateProperty.bind(this);
    this.deleteProperty = this.deleteProperty.bind(this);
    this.getMyProperties = this.getMyProperties.bind(this);
    this.getMyPropertyById = this.getMyPropertyById.bind(this);
  }

  /**
   * Get all properties with pagination and filters
   */
  async getAllProperties(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const userId = (req as any).user?.id; // Get user ID if authenticated
      const userRole = (req as any).user?.role || 'USER'; // Get user role

      const filters: PropertyQuery = {
        city: req.query.city as string,
        minPrice: req.query.minPrice as string,
        maxPrice: req.query.maxPrice as string,
        bedrooms: req.query.bedrooms as string,
        bathrooms: req.query.bathrooms as string,
        furnished: req.query.furnished as string,
        search: req.query.search as string,
        status: req.query.status as string,
      };

      // Create cache key based on query parameters
      const cacheKey = `properties:${JSON.stringify({ page, limit, filters, userRole })}`;
      
      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json({
          success: true,
          data: cachedData,
        });
      }

      // If not in cache, fetch from database
      const result = await this.propertiesService.getAllProperties(
        page,
        limit,
        filters,
        userId,
        userRole
      );

      // Store in cache
      cache.set(cacheKey, result);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Get properties error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }


  async getPropertyById(req: Request, res: Response): Promise<void> {
    try {
      const propertyId = req.params.id;
      const userId = (req as any).user?.id; // Get user ID if authenticated

      // Create cache key
      const cacheKey = `property:${propertyId}:${userId || 'anonymous'}`;
      
      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        res.json({
          ...cachedData,
          message: 'Property retrieved successfully (cached)'
        });
        return;
      }

      const property = await this.propertiesService.getPropertyById(
        propertyId,
        userId
      );

      const response = {
        success: true,
        data: { property },
      };

      // Cache the result for 15 minutes
      cache.set(cacheKey, response, 900);

      res.json(response);
    } catch (error) {
      console.error('Get property error:', error);

      if ((error as Error).message === 'Property not found') {
        return res.status(404).json({
          success: false,
          message: (error as Error).message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Create new property
   */
  async createProperty(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const property = await this.propertiesService.createProperty(
        req.body,
        userId
      );

      // Clear cache when new property is created
      cache.clear();

      res.status(201).json({
        success: true,
        message: 'Property created successfully',
        data: { property },
      });
    } catch (error) {
      console.error('Create property error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Update property
   */
  async updateProperty(req: Request, res: Response): Promise<void> {
    try {
      const propertyId = req.params.id;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || 'USER';

      const property = await this.propertiesService.updateProperty(
        propertyId,
        req.body,
        userId,
        userRole
      );

      // Clear cache when property is updated
      cache.clear();

      res.json({
        success: true,
        message: 'Property updated successfully',
        data: { property },
      });
    } catch (error) {
      console.error('Update property error:', error);

      if ((error as Error).message === 'Property not found') {
        return res.status(404).json({
          success: false,
          message: (error as Error).message,
        });
      }

      if ((error as Error).message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: (error as Error).message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Delete property
   */
  async deleteProperty(req: Request, res: Response): Promise<void> {
    try {
      const propertyId = req.params.id;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || 'USER';

      const result = await this.propertiesService.deleteProperty(
        propertyId,
        userId,
        userRole
      );

      // Clear cache when property is deleted
      cache.clear();

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Delete property error:', error);

      if ((error as Error).message === 'Property not found') {
        return res.status(404).json({
          success: false,
          message: (error as Error).message,
        });
      }

      if ((error as Error).message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: (error as Error).message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get landlord's own properties
   */
  async getMyProperties(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const filters: PropertyQuery = {
        city: req.query.city as string,
        minPrice: req.query.minPrice as string,
        maxPrice: req.query.maxPrice as string,
        bedrooms: req.query.bedrooms as string,
        bathrooms: req.query.bathrooms as string,
        furnished: req.query.furnished as string,
        search: req.query.search as string,
        status: req.query.status as string,
        ownerId: userId // Filter by owner
      };

      // Create cache key for landlord's properties
      const cacheKey = `my-properties:${userId}:${JSON.stringify({ page, limit, filters })}`;
      
      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        res.json({
          success: true,
          data: cachedData,
          message: 'My properties retrieved successfully (cached)'
        });
        return;
      }

      const result = await this.propertiesService.getMyPropertiesWithBookings(page, limit, filters);

      // Cache the result for 5 minutes (shorter for booking data)
      cache.set(cacheKey, result, 300);

      res.json({
        success: true,
        data: result,
        message: 'My properties retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting my properties:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get my properties',
        details: (error as Error).message
      });
    }
  }

  /**
   * Get landlord's specific property by ID
   */
  async getMyPropertyById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Create cache key for specific property
      const cacheKey = `my-property:${userId}:${id}`;
      
      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        res.json({
          success: true,
          data: cachedData,
          message: 'Property retrieved successfully (cached)'
        });
        return;
      }

      const property = await this.propertiesService.getPropertyById(id);

      if (!property) {
        res.status(404).json({
          success: false,
          error: 'Property not found'
        });
        return;
      }

      // Check if user owns this property
      if (property.ownerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to access this property'
        });
        return;
      }

      // Cache the result for 30 minutes
      cache.set(cacheKey, property, 1800);

      res.json({
        success: true,
        data: property,
        message: 'Property retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting my property by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get property',
        details: (error as Error).message
      });
    }
  }
}

export default new PropertiesController();
