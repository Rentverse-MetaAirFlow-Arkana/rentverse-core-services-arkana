import { Request, Response } from 'express';
import { db } from '../../config/database';
import { bookings, installments, bookingConflicts, paymentTransactions, properties, users, invoices, rentalAgreements, leases } from '../../db/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import PDFGenerationService from '../../services/pdfGeneration.service';

export class BookingController {
  
  // Check availability
  async checkAvailability(req: Request, res: Response) {
    try {
      const { propertyId, startDate, endDate } = req.body;

      console.log('Checking availability for:', { propertyId, startDate, endDate });

      const conflicts = await db
        .select()
        .from(bookingConflicts)
        .where(and(
          eq(bookingConflicts.propertyId, propertyId),
          gte(bookingConflicts.endDate, new Date(startDate)),
          lte(bookingConflicts.startDate, new Date(endDate))
        ));

      console.log('Found conflicts:', conflicts);

      const isAvailable = conflicts.length === 0;

      res.json({
        success: true,
        data: {
          available: isAvailable,
          conflicts: conflicts,
          message: isAvailable ? 'Property available for booking' : 'Property not available for selected dates'
        }
      });
    } catch (error) {
      console.error('Error checking availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check availability',
        details: (error as Error).message
      });
    }
  }

  // Create booking
  async createBooking(req: Request, res: Response) {
    try {
      const {
        propertyId,
        startDate,
        endDate,
        totalAmount,
        securityDeposit,
        paymentType,
        installmentCount = 1
      } = req.body;
      
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Validate required fields
      if (!paymentType || !['CASH', 'ONLINE'].includes(paymentType)) {
        return res.status(400).json({
          success: false,
          error: 'Payment type is required and must be either CASH or ONLINE'
        });
      }

      console.log('Creating booking:', { propertyId, userId, paymentType, installmentCount });

      // Get property owner
      const [property] = await db
        .select({ ownerId: properties.ownerId })
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      // Check availability again
      const conflicts = await db
        .select()
        .from(bookingConflicts)
        .where(and(
          eq(bookingConflicts.propertyId, propertyId),
          gte(bookingConflicts.endDate, new Date(startDate)),
          lte(bookingConflicts.startDate, new Date(endDate))
        ));

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Property not available for selected dates'
        });
      }

      // Create booking
      const [booking] = await db
        .insert(bookings)
        .values({
          propertyId,
          tenantId: userId,
          landlordId: property.ownerId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          totalAmount: totalAmount.toString(),
          securityDeposit: securityDeposit?.toString(),
          paymentType,
          installmentCount,
          status: 'PENDING'
        })
        .returning();

      console.log('Booking created:', booking);

      // Create corresponding lease record for compatibility with existing invoice system
      const [lease] = await db
        .insert(leases)
        .values({
          propertyId,
          tenantId: userId,
          landlordId: property.ownerId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          rentAmount: (totalAmount / installmentCount).toString(), // Monthly rent amount
          securityDeposit: securityDeposit?.toString(),
          status: 'APPROVED',
          notes: `Auto-generated lease for booking ${booking.id}`
        })
        .returning();

      console.log('Lease created:', lease);

      // Create conflict record
      await db
        .insert(bookingConflicts)
        .values({
          propertyId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          bookingId: booking.id
        });

      // Create installment records
      const installmentAmount = totalAmount / installmentCount;
      const installmentRecords = [];
      const invoiceRecords = [];
      
      for (let i = 1; i <= installmentCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        
        installmentRecords.push({
          bookingId: booking.id,
          installmentNumber: i,
          amount: installmentAmount.toString(),
          dueDate,
          status: 'UNPAID' as const
        });

        // Create invoice record for each installment
        invoiceRecords.push({
          leaseId: lease.id, // Using lease.id for proper foreign key
          type: 'RENT' as const,
          amount: installmentAmount.toString(),
          dueDate,
          status: 'DUE' as const,
          memo: `Installment ${i} of ${installmentCount} for booking ${booking.id}`
        });
      }

      const createdInstallments = await db
        .insert(installments)
        .values(installmentRecords)
        .returning();

      // Create invoice records
      const createdInvoices = await db
        .insert(invoices)
        .values(invoiceRecords)
        .returning();

      console.log('Installments created:', createdInstallments);
      console.log('Invoices created:', createdInvoices);

      // Generate PDF contract using existing PDF service
      let contractPdfUrl = '';
      let rentalAgreement = null;
      
      try {
        // Generate PDF using existing service
        const pdfResult = await PDFGenerationService.generateRentalAgreementPDF(booking.id);
        contractPdfUrl = pdfResult.url;

        // Create rental agreement record
        [rentalAgreement] = await db
          .insert(rentalAgreements)
          .values({
            leaseId: lease.id,
            pdfUrl: pdfResult.url,
            publicId: pdfResult.key,
            fileName: pdfResult.fileName,
            fileSize: pdfResult.size,
          })
          .returning();

        console.log('PDF generated and uploaded:', pdfResult);
      } catch (pdfError) {
        console.error('PDF generation failed, using placeholder:', pdfError);
        contractPdfUrl = `https://storage.example.com/contracts/${booking.id}.pdf`;
        
        // Create rental agreement record with placeholder
        [rentalAgreement] = await db
          .insert(rentalAgreements)
          .values({
            leaseId: lease.id,
            pdfUrl: contractPdfUrl,
            publicId: `contract_${booking.id}`,
            fileName: `rental_agreement_${booking.id}.pdf`,
            fileSize: 1024000,
          })
          .returning();
      }
      
      await db
        .update(bookings)
        .set({ 
          contractPdfUrl,
          contractGeneratedAt: new Date(),
          status: 'CONFIRMED'
        })
        .where(eq(bookings.id, booking.id));

      res.status(201).json({
        success: true,
        data: {
          booking: { ...booking, contractPdfUrl, status: 'CONFIRMED' },
          lease,
          installments: createdInstallments,
          invoices: createdInvoices,
          rentalAgreement,
          contractPdfUrl,
          message: 'Booking created successfully'
        }
      });

    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create booking',
        details: (error as Error).message
      });
    }
  }

  // Process installment payment
  async processInstallmentPayment(req: Request, res: Response) {
    try {
      const { installmentId, paymentMethod } = req.body;
      const userId = req.user?.id;

      // Validation
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!installmentId) {
        return res.status(400).json({
          success: false,
          error: 'Installment ID is required'
        });
      }

      // Validate payment method if provided
      const validPaymentMethods = ['BANK_TRANSFER', 'CASH', 'EWALLET', 'CREDIT_CARD'];
      if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          error: `Invalid payment method. Valid options: ${validPaymentMethods.join(', ')}`
        });
      }

      console.log('Processing payment for:', { installmentId, paymentMethod, userId });

      // Debug: Check if installment exists at all
      const allInstallments = await db
        .select({
          id: installments.id,
          bookingId: installments.bookingId,
          status: installments.status
        })
        .from(installments)
        .where(eq(installments.id, installmentId))
        .limit(1);

      console.log('Installment check:', allInstallments);

      if (!allInstallments.length) {
        return res.status(404).json({
          success: false,
          error: 'Installment ID not found in database',
          debug: { installmentId, userId }
        });
      }

      // Debug: Check booking ownership
      const bookingCheck = await db
        .select({
          id: bookings.id,
          tenantId: bookings.tenantId,
          landlordId: bookings.landlordId
        })
        .from(bookings)
        .where(eq(bookings.id, allInstallments[0].bookingId))
        .limit(1);

      console.log('Booking ownership check:', { bookingCheck, userId });

      // Find installment with booking details
      const installmentResult = await db
        .select({
          installment: installments,
          booking: bookings
        })
        .from(installments)
        .innerJoin(bookings, eq(installments.bookingId, bookings.id))
        .where(and(
          eq(installments.id, installmentId),
          eq(bookings.tenantId, userId)
        ))
        .limit(1);

      if (!installmentResult.length) {
        return res.status(404).json({
          success: false,
          error: 'Installment not found or you do not have permission to access it',
          debug: { 
            installmentExists: allInstallments.length > 0,
            bookingOwner: bookingCheck[0]?.tenantId,
            currentUser: userId,
            isOwner: bookingCheck[0]?.tenantId === userId
          }
        });
      }

      const { booking, installment: installmentData } = installmentResult[0];

      // Check if already paid
      if (installmentData.status === 'PAID') {
        return res.status(400).json({
          success: false,
          error: 'Installment is already paid'
        });
      }

      console.log('Found installment:', { 
        bookingPaymentType: booking.paymentType, 
        installmentAmount: installmentData.amount,
        installmentStatus: installmentData.status,
        requestPaymentMethod: paymentMethod
      });

      // Logic berdasarkan booking.paymentType (ditentukan saat create booking)
      if (booking.paymentType === 'CASH') {
        console.log('Processing as CASH payment (direct payment)');
        
        // Validate payment method for cash payments
        const validCashMethods = ['CASH'];
        const finalPaymentMethod = validCashMethods.includes(paymentMethod) ? paymentMethod : 'CASH';
        
        // Mark as paid directly for cash payments
        const updateResult = await db
          .update(installments)
          .set({
            status: 'PAID',
            paidAt: new Date(),
            paidAmount: installmentData.amount,
            paymentMethod: finalPaymentMethod
          })
          .where(eq(installments.id, installmentId))
          .returning();

        if (!updateResult.length) {
          return res.status(500).json({
            success: false,
            error: 'Failed to update installment status'
          });
        }

        // Create transaction record
        await db
          .insert(paymentTransactions)
          .values({
            installmentId,
            bookingId: booking.id,
            amount: installmentData.amount,
            paymentMethod: finalPaymentMethod,
            paymentType: 'CASH',
            status: 'COMPLETED',
            paidAt: new Date()
          });

        return res.json({
          success: true,
          data: {
            installmentId,
            status: 'PAID',
            paidAmount: installmentData.amount,
            paidAt: new Date()
          },
          message: 'Cash payment recorded successfully'
        });

      } else {
        console.log('Processing as ONLINE payment (Xendit integration)');
        
        // Debug: Check Xendit configuration
        const xenditKey = process.env.XENDIT_SECRET_KEY || process.env.XENDIT_API_KEY;
        console.log('Xendit key status:', {
          exists: !!xenditKey,
          keyPrefix: xenditKey ? xenditKey.substring(0, 8) + '...' : 'NOT_SET',
          keyLength: xenditKey ? xenditKey.length : 0,
          source: process.env.XENDIT_SECRET_KEY ? 'XENDIT_SECRET_KEY' : 'XENDIT_API_KEY'
        });

        if (!xenditKey) {
          return res.status(500).json({
            success: false,
            error: 'Xendit secret key not configured',
            details: 'Please set XENDIT_SECRET_KEY or XENDIT_API_KEY in your environment variables'
          });
        }
        
        // Handle online payment with Xendit
        const externalId = `installment_${installmentId}_${Date.now()}`;
        
        try {
          // Create Xendit invoice
          const xenditResponse = await fetch('https://api.xendit.co/v2/invoices', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(xenditKey + ':').toString('base64')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              external_id: externalId,
              amount: parseFloat(installmentData.amount),
              description: `Payment for installment ${installmentData.installmentNumber}`,
              invoice_duration: 86400, // 24 hours
              customer: {
                given_names: req.user?.firstName || 'Customer',
                surname: req.user?.lastName || '',
                email: req.user?.email || 'customer@example.com'
              },
              success_redirect_url: `rentverse://payment/success?external_id=${externalId}&installment_id=${installmentId}`,
              failure_redirect_url: `rentverse://payment/failed?external_id=${externalId}&installment_id=${installmentId}`,
              currency: 'IDR'
            })
          });

          if (!xenditResponse.ok) {
            const errorText = await xenditResponse.text();
            console.error('Xendit API error:', errorText);
            throw new Error(`Xendit API error: ${xenditResponse.status} - ${errorText}`);
          }

          const xenditData = await xenditResponse.json();
          console.log('Xendit invoice created successfully:', {
            invoiceId: xenditData.id,
            externalId: xenditData.external_id,
            amount: xenditData.amount,
            status: xenditData.status
          });

          // Update installment with Xendit info
          await db
            .update(installments)
            .set({
              xenditExternalId: externalId,
              xenditInvoiceId: xenditData.id
            })
            .where(eq(installments.id, installmentId));

          // Create payment transaction record
          await db.insert(paymentTransactions).values({
            bookingId: booking.id,
            installmentId: installmentId,
            amount: installmentData.amount,
            paymentMethod: 'BANK_TRANSFER',
            paymentType: 'ONLINE',
            xenditInvoiceId: xenditData.id,
            xenditExternalId: externalId,
            status: 'PENDING'
          });

          return res.json({
            success: true,
            data: {
              invoiceUrl: xenditData.invoice_url,
              externalId: xenditData.external_id,
              amount: xenditData.amount,
              invoiceId: xenditData.id,
              expiryDate: xenditData.expiry_date,
              status: xenditData.status
            },
            message: 'Payment invoice created successfully'
          });

        } catch (xenditError) {
          console.error('Xendit integration error:', xenditError);
          
          return res.status(500).json({
            success: false,
            error: 'Failed to create payment invoice',
            details: (xenditError as Error).message
          });
        }
      }

    } catch (error) {
      console.error('Error processing installment payment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process payment',
        details: (error as Error).message
      });
    }
  }

  // Get booking details
  async getBookingDetails(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      console.log('Getting booking details for:', { bookingId, userId });

      // Get booking with installments
      const [booking] = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.id, bookingId),
          eq(bookings.tenantId, userId)
        ))
        .limit(1);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      // Get installments for this booking
      const bookingInstallments = await db
        .select()
        .from(installments)
        .where(eq(installments.bookingId, bookingId))
        .orderBy(asc(installments.installmentNumber));

      res.json({
        success: true,
        data: {
          booking,
          installments: bookingInstallments,
          paymentFlow: booking.paymentType === 'CASH' ? 'Direct Payment' : 'Xendit Integration'
        }
      });

    } catch (error) {
      console.error('Error fetching booking details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch booking details',
        details: (error as Error).message
      });
    }
  }

  // Get user bookings
  async getUserBookings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { status } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      console.log('Getting user bookings for:', { userId, status });

      // Simple query first
      const userBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.tenantId, userId))
        .orderBy(desc(bookings.createdAt));

      res.json({
        success: true,
        data: userBookings
      });

    } catch (error) {
      console.error('Error fetching user bookings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings',
        details: (error as Error).message
      });
    }
  }

  // Get user installments (for debugging)
  async getUserInstallments(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { status } = req.query; // Optional filter: 'UNPAID', 'PAID', 'OVERDUE'

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      let whereConditions = [eq(bookings.tenantId, userId)];
      
      // Add status filter if provided
      if (status && ['UNPAID', 'PAID', 'OVERDUE'].includes(status as string)) {
        whereConditions.push(eq(installments.status, status as any));
      }

      const userInstallments = await db
        .select({
          installment: installments,
          booking: {
            id: bookings.id,
            tenantId: bookings.tenantId,
            propertyId: bookings.propertyId,
            status: bookings.status,
            paymentType: bookings.paymentType
          }
        })
        .from(installments)
        .innerJoin(bookings, eq(installments.bookingId, bookings.id))
        .where(and(...whereConditions))
        .orderBy(asc(installments.dueDate)); // Order by due date ascending

      res.json({
        success: true,
        data: userInstallments,
        count: userInstallments.length,
        filter: status || 'all'
      });

    } catch (error) {
      console.error('Error fetching user installments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch installments',
        details: (error as Error).message
      });
    }
  }

  // Get unpaid installments specifically
  async getUnpaidInstallments(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const unpaidInstallments = await db
        .select({
          installment: installments,
          booking: {
            id: bookings.id,
            propertyId: bookings.propertyId,
            paymentType: bookings.paymentType,
            status: bookings.status
          },
          property: {
            id: properties.id,
            title: properties.title,
            address: properties.address
          }
        })
        .from(installments)
        .innerJoin(bookings, eq(installments.bookingId, bookings.id))
        .innerJoin(properties, eq(bookings.propertyId, properties.id))
        .where(and(
          eq(bookings.tenantId, userId),
          eq(installments.status, 'UNPAID')
        ))
        .orderBy(asc(installments.dueDate));

      // Separate overdue and upcoming
      const now = new Date();
      const overdue = unpaidInstallments.filter(item => new Date(item.installment.dueDate) < now);
      const upcoming = unpaidInstallments.filter(item => new Date(item.installment.dueDate) >= now);

      res.json({
        success: true,
        data: {
          overdue,
          upcoming,
          all: unpaidInstallments
        },
        summary: {
          total: unpaidInstallments.length,
          overdue: overdue.length,
          upcoming: upcoming.length,
          totalAmount: unpaidInstallments.reduce((sum, item) => sum + parseFloat(item.installment.amount), 0)
        }
      });

    } catch (error) {
      console.error('Error fetching unpaid installments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch unpaid installments',
        details: (error as Error).message
      });
    }
  }

  // Manual payment confirmation (for testing when webhook not working)
  async manualPaymentConfirmation(req: Request, res: Response) {
    try {
      const { installmentId, xenditInvoiceId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      console.log('Manual payment confirmation:', { installmentId, xenditInvoiceId, userId });

      // Find installment
      const [result] = await db
        .select({
          installment: installments,
          booking: bookings
        })
        .from(installments)
        .innerJoin(bookings, eq(installments.bookingId, bookings.id))
        .where(and(
          eq(installments.id, installmentId),
          eq(bookings.tenantId, userId),
          eq(installments.xenditInvoiceId, xenditInvoiceId)
        ))
        .limit(1);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Installment not found or invalid invoice ID'
        });
      }

      const { installment } = result;

      if (installment.status === 'PAID') {
        return res.status(400).json({
          success: false,
          error: 'Installment already paid'
        });
      }

      // Verify payment with Xendit API (optional)
      try {
        const xenditKey = process.env.XENDIT_SECRET_KEY || process.env.XENDIT_API_KEY;
        const xenditResponse = await fetch(`https://api.xendit.co/v2/invoices/${xenditInvoiceId}`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(xenditKey + ':').toString('base64')}`
          }
        });

        if (xenditResponse.ok) {
          const xenditData = await xenditResponse.json();
          console.log('Xendit invoice status:', xenditData.status);
          
          if (xenditData.status !== 'PAID') {
            return res.status(400).json({
              success: false,
              error: `Payment not completed. Xendit status: ${xenditData.status}`
            });
          }
        }
      } catch (xenditError) {
        console.warn('Could not verify with Xendit API:', xenditError);
      }

      // Mark as paid
      await db
        .update(installments)
        .set({
          status: 'PAID',
          paidAt: new Date(),
          paidAmount: installment.amount,
          paymentMethod: 'BANK_TRANSFER'
        })
        .where(eq(installments.id, installmentId));

      // Update payment transaction
      await db
        .update(paymentTransactions)
        .set({
          status: 'COMPLETED',
          paidAt: new Date()
        })
        .where(eq(paymentTransactions.installmentId, installmentId));

      res.json({
        success: true,
        data: {
          installmentId,
          status: 'PAID',
          paidAmount: installment.amount,
          paidAt: new Date()
        },
        message: 'Payment confirmed manually'
      });

    } catch (error) {
      console.error('Error in manual payment confirmation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm payment',
        details: (error as Error).message
      });
    }
  }

  // Check payment status (for mobile callback)
  async checkPaymentStatus(req: Request, res: Response) {
    try {
      const { installmentId, externalId } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      console.log('Checking payment status:', { installmentId, externalId, userId });

      // Find installment by ID or external ID
      let whereCondition;
      if (installmentId) {
        whereCondition = eq(installments.id, installmentId as string);
      } else if (externalId) {
        whereCondition = eq(installments.xenditExternalId, externalId as string);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either installmentId or externalId is required'
        });
      }

      const [result] = await db
        .select({
          installment: installments,
          booking: bookings
        })
        .from(installments)
        .innerJoin(bookings, eq(installments.bookingId, bookings.id))
        .where(and(
          whereCondition,
          eq(bookings.tenantId, userId)
        ))
        .limit(1);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Installment not found'
        });
      }

      const { installment, booking } = result;

      res.json({
        success: true,
        data: {
          installmentId: installment.id,
          externalId: installment.xenditExternalId,
          status: installment.status,
          amount: installment.amount,
          paidAmount: installment.paidAmount,
          paidAt: installment.paidAt,
          paymentMethod: installment.paymentMethod,
          bookingId: booking.id,
          isPaid: installment.status === 'PAID'
        }
      });

    } catch (error) {
      console.error('Error checking payment status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check payment status',
        details: (error as Error).message
      });
    }
  }

  // Xendit webhook handler
  async handleXenditWebhook(req: Request, res: Response) {
    try {
      const webhookData = req.body;
      console.log('Xendit webhook received:', webhookData);

      // Verify webhook (optional but recommended)
      const callbackToken = req.headers['x-callback-token'];
      if (process.env.XENDIT_WEBHOOK_TOKEN && callbackToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
        return res.status(401).json({ error: 'Invalid webhook token' });
      }

      // Handle invoice paid event
      if (webhookData.status === 'PAID' && webhookData.external_id) {
        const externalId = webhookData.external_id;
        
        // Find installment by external ID
        const [installment] = await db
          .select()
          .from(installments)
          .where(eq(installments.xenditExternalId, externalId))
          .limit(1);

        if (!installment) {
          console.error('Installment not found for external ID:', externalId);
          return res.status(404).json({ error: 'Installment not found' });
        }

        // Update installment status to PAID
        await db
          .update(installments)
          .set({
            status: 'PAID',
            paidAt: new Date(webhookData.paid_at),
            paidAmount: webhookData.amount.toString(),
            paymentMethod: webhookData.payment_method || 'BANK_TRANSFER'
          })
          .where(eq(installments.id, installment.id));

        // Update payment transaction status
        await db
          .update(paymentTransactions)
          .set({
            status: 'COMPLETED',
            paidAt: new Date(webhookData.paid_at)
          })
          .where(eq(paymentTransactions.xenditExternalId, externalId));

        console.log('Payment processed successfully for installment:', installment.id);
      }

      // Always respond with 200 to acknowledge webhook
      res.status(200).json({ received: true });

    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  // Simulate payment success (for testing)
  async simulatePaymentSuccess(req: Request, res: Response) {
    try {
      const { installmentId, externalId } = req.body;

      console.log('Simulating payment success for:', { installmentId, externalId });

      // Find installment
      const [installment] = await db
        .select()
        .from(installments)
        .where(and(
          eq(installments.id, installmentId),
          eq(installments.xenditExternalId, externalId)
        ))
        .limit(1);

      if (!installment) {
        return res.status(404).json({
          success: false,
          error: 'Installment not found'
        });
      }

      // Mark as paid
      await db
        .update(installments)
        .set({
          status: 'PAID',
          paidAt: new Date(),
          paidAmount: installment.amount,
          paymentMethod: 'CREDIT_CARD'
        })
        .where(eq(installments.id, installmentId));

      // Update corresponding invoice status
      await db
        .update(invoices)
        .set({
          status: 'PAID',
          paidAt: new Date()
        })
        .where(eq(invoices.leaseId, installment.bookingId));

      // Create transaction record
      await db
        .insert(paymentTransactions)
        .values({
          installmentId,
          bookingId: installment.bookingId,
          amount: installment.amount,
          paymentMethod: 'CREDIT_CARD',
          paymentType: 'ONLINE',
          xenditExternalId: externalId,
          status: 'COMPLETED',
          paidAt: new Date()
        });

      res.json({
        success: true,
        message: 'Payment marked as successful',
        data: {
          installmentId,
          status: 'PAID',
          paidAmount: installment.amount
        }
      });

    } catch (error) {
      console.error('Error simulating payment success:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to simulate payment success',
        details: (error as Error).message
      });
    }
  }
}

export default new BookingController();
