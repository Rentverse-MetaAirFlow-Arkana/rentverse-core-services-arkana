import { db } from '../../config/database';
import {
  properties,
  users,
  propertyTypes,
  propertyViews,
  propertyFavorites,
  amenities,
  propertyAmenities,
  propertyRatings,
  bookings,
  installments,
} from '../../db/schema';
import { eq, and, like, gte, lte, desc, count, sql, avg } from 'drizzle-orm';
import { PropertyQuery } from '../../types';
import { CodeGenerator } from '../../utils/codeGenerator';
import { randomUUID } from 'crypto';

export class PropertiesService {
  // Helper function to generate Google Maps URL
  generateMapsUrl(
    latitude: number | null,
    longitude: number | null
  ): string | null {
    if (!latitude || !longitude) return null;
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  // Helper function to add maps URL to property
  addMapsUrlToProperty(property: any) {
    if (property) {
      if (property.latitude && property.longitude) {
        property.mapsUrl = this.generateMapsUrl(
          property.latitude,
          property.longitude
        );
      } else {
        property.mapsUrl = null;
      }
    }
    return property;
  }

  // Helper function to add view count to property
  async addViewCountToProperty(property: any) {
    if (property) {
      const [viewResult] = await db
        .select({ count: count() })
        .from(propertyViews)
        .where(eq(propertyViews.propertyId, property.id));

      property.viewCount = viewResult?.count || 0;
    }
    return property;
  }

  // Helper function to add view count to multiple properties
  async addViewCountToProperties(properties: any[]) {
    if (!properties || properties.length === 0) return properties;

    const propertyIds = properties.map(p => p.property.id);
    const viewCounts = await db
      .select({
        propertyId: propertyViews.propertyId,
        count: count(),
      })
      .from(propertyViews)
      .where(sql`${propertyViews.propertyId} IN ${propertyIds}`)
      .groupBy(propertyViews.propertyId);

    const viewCountMap = viewCounts.reduce(
      (acc, item) => {
        acc[item.propertyId] = item.count;
        return acc;
      },
      {} as Record<string, number>
    );

    return properties.map(item => ({
      ...item,
      property: {
        ...item.property,
        viewCount: viewCountMap[item.property.id] || 0,
        mapsUrl: this.generateMapsUrl(
          item.property.latitude,
          item.property.longitude
        ),
      },
    }));
  }

  // Helper function to add favorite info to properties
  async addFavoriteInfoToProperties(
    properties: any[],
    userId: string | null = null
  ) {
    if (!properties || properties.length === 0) return properties;

    const propertyIds = properties.map(p => p.property.id);

    // Get favorite counts
    const favoriteCounts = await db
      .select({
        propertyId: propertyFavorites.propertyId,
        count: count(),
      })
      .from(propertyFavorites)
      .where(sql`${propertyFavorites.propertyId} IN ${propertyIds}`)
      .groupBy(propertyFavorites.propertyId);

    const favoriteCountMap = favoriteCounts.reduce(
      (acc, item) => {
        acc[item.propertyId] = item.count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get user favorites if authenticated
    let userFavorites: Record<string, boolean> = {};
    if (userId) {
      const favorites = await db
        .select({ propertyId: propertyFavorites.propertyId })
        .from(propertyFavorites)
        .where(
          and(
            eq(propertyFavorites.userId, userId),
            sql`${propertyFavorites.propertyId} IN ${propertyIds}`
          )
        );

      userFavorites = favorites.reduce(
        (acc, item) => {
          acc[item.propertyId] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
    }

    return properties.map(item => ({
      ...item,
      property: {
        ...item.property,
        favoriteCount: favoriteCountMap[item.property.id] || 0,
        isFavorited: userFavorites[item.property.id] || false,
      },
    }));
  }

  async getAllProperties(
    page = 1,
    limit = 10,
    filters: PropertyQuery = {},
    userId: string | null = null,
    userRole = 'USER'
  ) {
    const offset = (page - 1) * limit;
    const conditions = [];

    // For non-admin users, only show APPROVED properties
    if (userRole !== 'ADMIN') {
      conditions.push(eq(properties.status, 'APPROVED'));
    }

    // Apply filters
    if (filters.city) {
      conditions.push(like(properties.city, `%${filters.city}%`));
    }

    if (filters.minPrice) {
      conditions.push(gte(properties.price, filters.minPrice.toString()));
    }

    if (filters.maxPrice) {
      conditions.push(lte(properties.price, filters.maxPrice.toString()));
    }

    if (filters.bedrooms) {
      conditions.push(eq(properties.bedrooms, Number(filters.bedrooms)));
    }

    if (filters.bathrooms) {
      conditions.push(eq(properties.bathrooms, Number(filters.bathrooms)));
    }

    if (filters.furnished !== undefined) {
      conditions.push(eq(properties.furnished, filters.furnished === true));
    }

    if (filters.search) {
      conditions.push(
        sql`${properties.title} ILIKE ${`%${filters.search}%`} OR ${properties.description} ILIKE ${`%${filters.search}%`}`
      );
    }

    // Only allow admin to filter by status
    if (filters.status && userRole === 'ADMIN') {
      conditions.push(
        eq(
          properties.status,
          filters.status as 'PENDING_REVIEW' | 'REJECTED' | 'APPROVED'
        )
      );
    }

    // Filter by owner ID (for landlord's own properties)
    if (filters.ownerId) {
      conditions.push(eq(properties.ownerId, filters.ownerId));
    }

    // Get properties with relations
    let propertiesData = await db
      .select({
        property: properties,
        owner: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
        },
        amenities: sql`json_agg(DISTINCT ${amenities}) FILTER (WHERE ${amenities.id} IS NOT NULL)`.as('amenities_list'),
        propertyType: propertyTypes,
      })
      .from(properties)
      .leftJoin(users, eq(properties.ownerId, users.id))
      .leftJoin(propertyTypes, eq(properties.propertyTypeId, propertyTypes.id))
      .leftJoin(
        propertyAmenities,
        eq(properties.id, propertyAmenities.propertyId)
      )
      .leftJoin(amenities, eq(propertyAmenities.amenityId, amenities.id))
      .groupBy(properties.id, users.id, propertyTypes.id)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    // Add ratings data separately to avoid complex joins
    for (const item of propertiesData) {
      const ratingsData = await db
        .select({
          id: propertyRatings.id,
          rating: propertyRatings.rating,
          comment: propertyRatings.comment,
          ratedAt: propertyRatings.ratedAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(propertyRatings)
        .leftJoin(users, eq(propertyRatings.userId, users.id))
        .where(eq(propertyRatings.propertyId, item.property.id))
        .orderBy(desc(propertyRatings.ratedAt));

      const [avgRating] = await db
        .select({ avg: avg(propertyRatings.rating) })
        .from(propertyRatings)
        .where(eq(propertyRatings.propertyId, item.property.id));

      item.ratings = ratingsData;
      item.averageRating = avgRating.avg ? Number(avgRating.avg).toFixed(1) : null;
      item.totalRatings = ratingsData.length;
    }

    // Add view counts, maps URLs, and favorite info
    propertiesData = await this.addViewCountToProperties(propertiesData);
    propertiesData = await this.addFavoriteInfoToProperties(
      propertiesData,
      userId
    );

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(properties)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limit);

    return {
      properties: propertiesData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getPropertyById(propertyId: string, userId: string | null = null) {
    const [propertyData] = await db
      .select({
        property: properties,
        owner: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
        },
        amenities: sql`json_agg(DISTINCT ${amenities}) FILTER (WHERE ${amenities.id} IS NOT NULL)`.as('amenities_list'),
        propertyType: propertyTypes,
      })
      .from(properties)
      .leftJoin(users, eq(properties.ownerId, users.id))
      .leftJoin(propertyTypes, eq(properties.propertyTypeId, propertyTypes.id))
      .leftJoin(
        propertyAmenities,
        eq(properties.id, propertyAmenities.propertyId)
      )
      .leftJoin(amenities, eq(propertyAmenities.amenityId, amenities.id))
      .groupBy(properties.id, users.id, propertyTypes.id)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!propertyData) {
      throw new Error('Property not found');
    }

    // Add ratings data
    const ratingsData = await db
      .select({
        id: propertyRatings.id,
        rating: propertyRatings.rating,
        comment: propertyRatings.comment,
        ratedAt: propertyRatings.ratedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(propertyRatings)
      .leftJoin(users, eq(propertyRatings.userId, users.id))
      .where(eq(propertyRatings.propertyId, propertyId))
      .orderBy(desc(propertyRatings.ratedAt));

    const [avgRating] = await db
      .select({ avg: avg(propertyRatings.rating) })
      .from(propertyRatings)
      .where(eq(propertyRatings.propertyId, propertyId));

    propertyData.ratings = ratingsData;
    propertyData.averageRating = avgRating.avg ? Number(avgRating.avg).toFixed(1) : null;
    propertyData.totalRatings = ratingsData.length;

    // Add additional info
    const enrichedData = await this.addViewCountToProperties([propertyData]);
    const finalData = await this.addFavoriteInfoToProperties(
      enrichedData,
      userId
    );

    return finalData[0];
  }

  async createProperty(propertyData: any, ownerId: string) {
    // Generate unique property code
    const propertyCode = CodeGenerator.generatePropertyCode();
    const now = new Date();

    const newPropertyData = {
      id: randomUUID(),
      ...propertyData,
      ownerId,
      code: propertyCode,
      status: 'PENDING_REVIEW' as const,
      createdAt: now,
      updatedAt: now,
    };

    const [newProperty] = await db
      .insert(properties)
      .values(newPropertyData)
      .returning();

    return newProperty;
  }

  async updateProperty(
    propertyId: string,
    updateData: any,
    userId: string,
    userRole: string
  ) {
    // Check if property exists and user has permission
    const [existingProperty] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!existingProperty) {
      throw new Error('Property not found');
    }

    // Check permissions
    if (userRole !== 'ADMIN' && existingProperty.ownerId !== userId) {
      throw new Error('Access denied: You can only update your own properties');
    }

    const [updatedProperty] = await db
      .update(properties)
      .set(updateData)
      .where(eq(properties.id, propertyId))
      .returning();

    return updatedProperty;
  }

  async deleteProperty(propertyId: string, userId: string, userRole: string) {
    // Check if property exists and user has permission
    const [existingProperty] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!existingProperty) {
      throw new Error('Property not found');
    }

    // Check permissions
    if (userRole !== 'ADMIN' && existingProperty.ownerId !== userId) {
      throw new Error('Access denied: You can only delete your own properties');
    }

    await db.delete(properties).where(eq(properties.id, propertyId));

    return { message: 'Property deleted successfully' };
  }

  // Separate method for landlord's properties with bookings
  async getMyPropertiesWithBookings(page: number, limit: number, filters: PropertyQuery) {
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    // Build where conditions
    if (filters.ownerId) {
      conditions.push(sql`${properties.ownerId}::text = ${filters.ownerId}::text`);
    }
    if (filters.city) {
      conditions.push(like(properties.city, `%${filters.city}%`));
    }
    if (filters.minPrice) {
      conditions.push(gte(properties.price, filters.minPrice));
    }
    if (filters.maxPrice) {
      conditions.push(lte(properties.price, filters.maxPrice));
    }
    if (filters.bedrooms) {
      conditions.push(eq(properties.bedrooms, parseInt(filters.bedrooms)));
    }
    if (filters.bathrooms) {
      conditions.push(eq(properties.bathrooms, parseInt(filters.bathrooms)));
    }
    if (filters.furnished) {
      conditions.push(eq(properties.furnished, filters.furnished));
    }
    if (filters.status) {
      conditions.push(eq(properties.status, filters.status));
    }
    if (filters.search) {
      conditions.push(
        sql`(${properties.title} ILIKE ${`%${filters.search}%`} OR ${properties.description} ILIKE ${`%${filters.search}%`})`
      );
    }

    // Get properties with relations
    let propertiesData = await db
      .select({
        property: properties,
        owner: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
        },
        amenities: sql`json_agg(DISTINCT ${amenities}) FILTER (WHERE ${amenities.id} IS NOT NULL)`.as('amenities_list'),
        propertyType: propertyTypes,
      })
      .from(properties)
      .leftJoin(users, eq(properties.ownerId, users.id))
      .leftJoin(propertyTypes, eq(properties.propertyTypeId, propertyTypes.id))
      .leftJoin(
        propertyAmenities,
        eq(properties.id, propertyAmenities.propertyId)
      )
      .leftJoin(amenities, eq(propertyAmenities.amenityId, amenities.id))
      .groupBy(properties.id, users.id, propertyTypes.id)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    // Add ratings and bookings data separately
    for (const item of propertiesData) {
      // Add ratings data
      const ratingsData = await db
        .select({
          id: propertyRatings.id,
          rating: propertyRatings.rating,
          comment: propertyRatings.comment,
          ratedAt: propertyRatings.ratedAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(propertyRatings)
        .leftJoin(users, eq(propertyRatings.userId, users.id))
        .where(eq(propertyRatings.propertyId, item.property.id))
        .orderBy(desc(propertyRatings.ratedAt));

      const [avgRating] = await db
        .select({ avg: avg(propertyRatings.rating) })
        .from(propertyRatings)
        .where(eq(propertyRatings.propertyId, item.property.id));

      item.ratings = ratingsData;
      item.averageRating = avgRating.avg ? Number(avgRating.avg).toFixed(1) : null;
      item.totalRatings = ratingsData.length;

      // Add bookings data for landlord's properties
      const bookingsData = await db
        .select({
          id: bookings.id,
          startDate: bookings.startDate,
          endDate: bookings.endDate,
          totalAmount: bookings.totalAmount,
          securityDeposit: bookings.securityDeposit,
          paymentType: bookings.paymentType,
          installmentCount: bookings.installmentCount,
          status: bookings.status,
          createdAt: bookings.createdAt,
          tenant: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
          },
        })
        .from(bookings)
        .leftJoin(users, sql`${bookings.tenantId}::text = ${users.id}::text`)
        .where(sql`${bookings.propertyId}::text = ${item.property.id}::text`)
        .orderBy(desc(bookings.createdAt));

      // Add installments data for each booking
      for (const booking of bookingsData) {
        const installmentsData = await db
          .select({
            id: installments.id,
            installmentNumber: installments.installmentNumber,
            amount: installments.amount,
            dueDate: installments.dueDate,
            status: installments.status,
            paidAt: installments.paidAt,
            paidAmount: installments.paidAmount,
            paymentMethod: installments.paymentMethod,
            xenditInvoiceId: installments.xenditInvoiceId,
            xenditExternalId: installments.xenditExternalId,
            createdAt: installments.createdAt,
          })
          .from(installments)
          .where(sql`${installments.bookingId}::text = ${booking.id}::text`)
          .orderBy(installments.installmentNumber);

        booking.installments = installmentsData;
        booking.installmentsSummary = {
          total: installmentsData.length,
          paid: installmentsData.filter(inst => inst.status === 'PAID').length,
          unpaid: installmentsData.filter(inst => inst.status === 'UNPAID').length,
          overdue: installmentsData.filter(inst => inst.status === 'OVERDUE').length,
          totalPaidAmount: installmentsData
            .filter(inst => inst.status === 'PAID')
            .reduce((sum, inst) => sum + Number(inst.paidAmount || 0), 0),
          totalUnpaidAmount: installmentsData
            .filter(inst => inst.status !== 'PAID')
            .reduce((sum, inst) => sum + Number(inst.amount), 0),
        };
      }

      item.bookings = bookingsData;
      item.totalBookings = bookingsData.length;
    }

    // Add view counts, maps URLs, and favorite info
    propertiesData = await this.addViewCountToProperties(propertiesData);
    propertiesData = await this.addFavoriteInfoToProperties(
      propertiesData,
      null // No userId for landlord view
    );

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(properties)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult.count;

    return {
      properties: propertiesData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
}
