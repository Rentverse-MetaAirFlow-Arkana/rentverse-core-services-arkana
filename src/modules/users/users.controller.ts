import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { db } from '../../config/database';
import { users, propertyFavorites, properties, propertyTypes } from '../../db/schema';
import { eq, like, desc, count, and } from 'drizzle-orm';
import { ApiResponse, PaginatedResponse, NewUser, JwtPayload } from '../../types';
import { cache } from '../../utils/cache';

class UsersController {
  /**
   * Register new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, phone, role = 'USER' } = req.body;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'User with this email already exists',
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const now = new Date();
      const newUserData: NewUser = {
        id: randomUUID(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`, // Required computed field
        phone,
        role: role as 'USER' | 'ADMIN',
        createdAt: now,
        updatedAt: now,
      };

      const [newUser] = await db
        .insert(users)
        .values(newUserData)
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          role: users.role,
          createdAt: users.createdAt,
        });

      // Generate JWT token
      const payload: JwtPayload = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully',
        data: {
          user: newUser,
          token,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register user',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user || !user.password) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Generate JWT token
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          token,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to login',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { password: _, ...userWithoutPassword } = req.user!;

      const response: ApiResponse = {
        success: true,
        data: userWithoutPassword,
      };

      res.json(response);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { firstName, lastName, phone } = req.body;
      const userId = req.user!.id;

      const [updatedUser] = await db
        .update(users)
        .set({
          firstName,
          lastName,
          phone,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          role: users.role,
          updatedAt: users.updatedAt,
        });

      const response: ApiResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      };

      res.json(response);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, search, role } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Build where conditions
      const conditions = [];
      
      if (search) {
        conditions.push(
          like(users.email, `%${search}%`)
        );
      }
      
      if (role) {
        conditions.push(eq(users.role, role as string));
      }

      // Get users
      const usersData = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          role: users.role,
          isEmailVerified: users.isEmailVerified,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(users.createdAt))
        .limit(Number(limit))
        .offset(offset);

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult.count;
      const totalPages = Math.ceil(total / Number(limit));

      const response: PaginatedResponse = {
        success: true,
        data: usersData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get user's favorite properties
   */
  async getFavorites(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Get user's favorite properties
      const favoritesData = await db
        .select({
          id: propertyFavorites.id,
          favoritedAt: propertyFavorites.favoritedAt,
          property: {
            id: properties.id,
            title: properties.title,
            description: properties.description,
            address: properties.address,
            city: properties.city,
            state: properties.state,
            price: properties.price,
            currencyCode: properties.currencyCode,
            bedrooms: properties.bedrooms,
            bathrooms: properties.bathrooms,
            areaSqm: properties.areaSqm,
            furnished: properties.furnished,
            images: properties.images,
            latitude: properties.latitude,
            longitude: properties.longitude,
            isAvailable: properties.isAvailable,
            status: properties.status,
          },
          propertyType: {
            id: propertyTypes.id,
            name: propertyTypes.name,
            code: propertyTypes.code,
          },
        })
        .from(propertyFavorites)
        .leftJoin(properties, eq(propertyFavorites.propertyId, properties.id))
        .leftJoin(propertyTypes, eq(properties.propertyTypeId, propertyTypes.id))
        .where(eq(propertyFavorites.userId, userId))
        .orderBy(desc(propertyFavorites.favoritedAt))
        .limit(Number(limit))
        .offset(offset);

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(propertyFavorites)
        .where(eq(propertyFavorites.userId, userId));

      const total = totalResult.count;
      const totalPages = Math.ceil(total / Number(limit));

      const response: PaginatedResponse = {
        success: true,
        data: favoritesData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch favorites',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Change user password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      // Get current user with password
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user.password) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
        });
        return;
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await db
        .update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 10, status } = req.query;

      // Mock response for now - implement with actual bookings table
      res.json({
        success: true,
        data: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0,
        },
        message: 'Bookings feature not yet implemented',
      });
    } catch (error) {
      console.error('Get user bookings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
        return;
      }

      // For now, just return a mock response
      // In production, implement proper refresh token logic
      res.json({
        success: true,
        message: 'Refresh token feature not yet implemented',
        data: {
          token: 'mock-new-token',
          refreshToken: 'mock-new-refresh-token',
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh token',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Google authentication
   */
  async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { googleId, email, name, firstName, lastName, profilePicture } = req.body;

      // Check if user already exists by googleId or email
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.googleId, googleId))
        .limit(1);

      let user;

      if (existingUser) {
        // Update existing user
        [user] = await db
          .update(users)
          .set({
            name,
            firstName,
            lastName,
            profilePicture,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            name: users.name,
            phone: users.phone,
            profilePicture: users.profilePicture,
            role: users.role,
            googleId: users.googleId,
          });
      } else {
        // Check if user exists by email (for linking accounts)
        const [emailUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (emailUser) {
          // Link Google account to existing email user
          [user] = await db
            .update(users)
            .set({
              googleId,
              name,
              firstName,
              lastName,
              profilePicture,
              updatedAt: new Date(),
            })
            .where(eq(users.id, emailUser.id))
            .returning({
              id: users.id,
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
              name: users.name,
              phone: users.phone,
              profilePicture: users.profilePicture,
              role: users.role,
              googleId: users.googleId,
            });
        } else {
          // Create new user
          const now = new Date();
          const newUserData: NewUser = {
            id: randomUUID(),
            email,
            password: '', // No password for Google users
            firstName,
            lastName,
            name,
            profilePicture,
            googleId,
            role: 'USER',
            isActive: true,
            createdAt: now,
            updatedAt: now,
          };

          [user] = await db
            .insert(users)
            .values(newUserData)
            .returning({
              id: users.id,
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
              name: users.name,
              phone: users.phone,
              profilePicture: users.profilePicture,
              role: users.role,
              googleId: users.googleId,
            });
        }
      }

      // Generate JWT token
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      const response: ApiResponse = {
        success: true,
        message: 'Google authentication successful',
        data: {
          user,
          token,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to authenticate with Google',
        message: (error as Error).message,
      });
    }
  }
}

export default new UsersController();
