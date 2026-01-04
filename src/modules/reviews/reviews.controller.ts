import { Request, Response } from 'express';
import { db } from '../../db';
import { propertyRatings, properties, users } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const getPropertyReviews = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;

    const reviews = await db
      .select({
        id: propertyRatings.id,
        rating: propertyRatings.rating,
        comment: propertyRatings.comment,
        createdAt: propertyRatings.ratedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture,
        }
      })
      .from(propertyRatings)
      .innerJoin(users, eq(propertyRatings.userId, users.id))
      .where(eq(propertyRatings.propertyId, propertyId))
      .orderBy(desc(propertyRatings.ratedAt));

    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error('Error fetching property reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property reviews',
    });
  }
};

export const createPropertyReview = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    // Check if property exists
    const property = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (property.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Check if user already reviewed this property
    const existingReview = await db
      .select()
      .from(propertyRatings)
      .where(and(
        eq(propertyRatings.propertyId, propertyId),
        eq(propertyRatings.userId, userId)
      ))
      .limit(1);

    if (existingReview.length > 0) {
      // Update existing review
      const [updatedReview] = await db
        .update(propertyRatings)
        .set({
          rating,
          comment,
          updatedAt: new Date(),
        })
        .where(and(
          eq(propertyRatings.propertyId, propertyId),
          eq(propertyRatings.userId, userId)
        ))
        .returning();

      return res.json({
        success: true,
        data: updatedReview,
        message: 'Review updated successfully',
      });
    }

    // Create new review
    const [newReview] = await db
      .insert(propertyRatings)
      .values({
        propertyId,
        userId,
        rating,
        comment,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newReview,
      message: 'Review created successfully',
    });
  } catch (error) {
    console.error('Error creating property review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create property review',
    });
  }
};
