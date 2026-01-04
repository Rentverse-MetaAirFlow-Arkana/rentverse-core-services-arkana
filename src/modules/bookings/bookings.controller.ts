import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../../config/database';
import { bookings, properties, users, installments } from '../../db/schema';
import { eq, and, desc, count, gte, lte, sql } from 'drizzle-orm';
import { ApiResponse, PaginatedResponse } from '../../types';
import { cache } from '../../utils/cache';

class BookingsController {
  /**
   * Get all bookings with filters
   */
  async getAllBookings(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, status, userId, propertyId, startDate, endDate } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Build where conditions
      const conditions = [];
      
      if (status) {
        conditions.push(eq(bookings.status, status as string));
      }
      
      if (userId) {
        conditions.push(eq(bookings.tenantId, userId as string));
      }
      
      if (propertyId) {
        conditions.push(eq(bookings.propertyId, propertyId as string));
      }
      
      if (startDate) {
        conditions.push(gte(bookings.startDate, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(bookings.endDate, new Date(endDate as string)));
      }

      // Get bookings with relations
      const bookingsData = await db
        .select({
          booking: bookings,
          property: {
            id: properties.id,
            title: properties.title,
            address: properties.address,
            city: properties.city,
            price: properties.price,
          },
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(bookings)
        .leftJoin(properties, eq(bookings.propertyId, properties.id))
        .leftJoin(users, eq(bookings.tenantId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(bookings.createdAt))
        .limit(Number(limit))
        .offset(offset);

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(bookings)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult.count;
      const totalPages = Math.ceil(total / Number(limit));

      const response: PaginatedResponse = {
        success: true,
        data: bookingsData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const [bookingData] = await db
        .select({
          booking: bookings,
          property: properties,
          tenant: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(bookings)
        .leftJoin(properties, sql`${bookings.propertyId}::text = ${properties.id}::text`)
        .leftJoin(users, sql`${bookings.tenantId}::text = ${users.id}::text`)
        .where(sql`${bookings.id}::text = ${id}::text`)
        .limit(1);

      if (!bookingData) {
        res.status(404).json({
          success: false,
          error: 'Booking not found',
        });
        return;
      }

      // Add installments data
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
          reminderSentAt: installments.reminderSentAt,
          createdAt: installments.createdAt,
          updatedAt: installments.updatedAt,
        })
        .from(installments)
        .where(sql`${installments.bookingId}::text = ${bookingData.booking.id}::text`)
        .orderBy(installments.installmentNumber);

      // Add installments summary
      bookingData.installments = installmentsData;
      bookingData.installmentsSummary = {
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

      const response: ApiResponse = {
        success: true,
        data: bookingData,
      };

      res.json(response);
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch booking',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Create new booking (lease)
   */
  async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const { propertyId, startDate, endDate, notes } = req.body;
      const userId = req.user!.id;

      // Check if property exists and is available
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);

      if (!property) {
        res.status(404).json({
          success: false,
          error: 'Property not found',
        });
        return;
      }

      if (!property.isAvailable) {
        res.status(400).json({
          success: false,
          error: 'Property is not available for booking',
        });
        return;
      }

      // Calculate rent amount (using property price)
      const now = new Date();
      const leaseData = {
        id: randomUUID(),
        propertyId,
        tenantId: userId,
        landlordId: property.ownerId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        rentAmount: property.price,
        currencyCode: property.currencyCode || 'MYR',
        status: 'PENDING' as const,
        notes,
        createdAt: now,
        updatedAt: now,
      };

      const [newBooking] = await db
        .insert(bookings)
        .values(leaseData)
        .returning();

      const response: ApiResponse = {
        success: true,
        message: 'Booking created successfully',
        data: newBooking,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create booking',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      // Check if booking exists
      const [existingBooking] = await db
        .select()
        .from(leases)
        .where(eq(leases.id, id))
        .limit(1);

      if (!existingBooking) {
        res.status(404).json({
          success: false,
          error: 'Booking not found',
        });
        return;
      }

      // Check permissions
      if (existingBooking.tenantId !== req.user!.id && req.user!.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Access denied. You can only update your own bookings.',
        });
        return;
      }

      const [updatedBooking] = await db
        .update(leases)
        .set({ 
          status, 
          notes,
          updatedAt: new Date() 
        })
        .where(eq(leases.id, id))
        .returning();

      const response: ApiResponse = {
        success: true,
        message: 'Booking updated successfully',
        data: updatedBooking,
      };

      res.json(response);
    } catch (error) {
      console.error('Update booking error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update booking',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if booking exists
      const [existingBooking] = await db
        .select()
        .from(leases)
        .where(eq(leases.id, id))
        .limit(1);

      if (!existingBooking) {
        res.status(404).json({
          success: false,
          error: 'Booking not found',
        });
        return;
      }

      // Check permissions
      if (existingBooking.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Access denied. You can only cancel your own leases.',
        });
        return;
      }

      // Check if booking can be cancelled
      if (existingBooking.status === 'CANCELLED' || existingBooking.status === 'COMPLETED') {
        res.status(400).json({
          success: false,
          error: 'Booking cannot be cancelled',
        });
        return;
      }

      const [cancelledBooking] = await db
        .update(bookings)
        .set({ 
          status: 'CANCELLED',
          updatedAt: new Date() 
        })
        .where(eq(leases.id, id))
        .returning();

      const response: ApiResponse = {
        success: true,
        message: 'Booking cancelled successfully',
        data: cancelledBooking,
      };

      res.json(response);
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel booking',
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get user's bookings (leases)
   */
  async getUserBookings(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const userId = req.user!.id;

      // Build where conditions
      const conditions = [sql`${bookings.tenantId}::text = ${userId}::text`];
      
      if (status) {
        conditions.push(eq(bookings.status, status as string));
      }

      // Get user's bookings
      const userBookings = await db
        .select({
          booking: bookings,
          property: {
            id: properties.id,
            title: properties.title,
            address: properties.address,
            city: properties.city,
            price: properties.price,
            images: properties.images,
          },
        })
        .from(bookings)
        .leftJoin(properties, sql`${bookings.propertyId}::text = ${properties.id}::text`)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(bookings.createdAt))
        .limit(Number(limit))
        .offset(offset);

      // Add installments data for each booking
      for (const item of userBookings) {
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
          .where(sql`${installments.bookingId}::text = ${item.booking.id}::text`)
          .orderBy(installments.installmentNumber);

        item.installments = installmentsData;
        item.totalInstallments = installmentsData.length;
        item.paidInstallments = installmentsData.filter(inst => inst.status === 'PAID').length;
        item.unpaidInstallments = installmentsData.filter(inst => inst.status === 'UNPAID').length;
        item.overdueInstallments = installmentsData.filter(inst => inst.status === 'OVERDUE').length;
      }

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(bookings)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult.count;
      const totalPages = Math.ceil(total / Number(limit));

      const response: PaginatedResponse = {
        success: true,
        data: userBookings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Get user bookings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user bookings',
        message: (error as Error).message,
      });
    }
  }
}

export default new BookingsController();
