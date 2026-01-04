import { Request, Response } from 'express';
import { db } from '../../config/database';
import { xenditClient } from '../../config/payment';
import { payment, leases, properties } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export class MobilePaymentController {
  // Create payment for property booking
  async createBookingPayment(req: Request, res: Response) {
    try {
      const { leaseId, amount, description } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      // Verify lease belongs to user
      const [lease] = await db
        .select()
        .from(leases)
        .where(and(
          eq(leases.id, leaseId),
          eq(leases.tenantId, userId)
        ))
        .limit(1);

      if (!lease) {
        return res.status(404).json({
          success: false,
          error: 'Lease not found or unauthorized',
        });
      }

      const externalId = `lease_${leaseId}_${Date.now()}`;

      // Create Xendit invoice
      const invoiceData = {
        amount: amount,
        invoiceDuration: 172800, // 48 hours
        externalId: externalId,
        description: description || `Payment for lease ${leaseId}`,
        currency: 'IDR',
        reminderTime: 1,
        successRedirectUrl: 'myapp://payment/success',
        failureRedirectUrl: 'myapp://payment/failed',
        customer: {
          email: req.user?.email,
        },
        paymentMethods: ['VA', 'CREDIT_CARD', 'QRIS', 'EWALLET', 'RETAIL_OUTLET'],
      };

      const invoice = await xenditClient.Invoice.createInvoice({
        data: invoiceData,
      });

      // Save payment record
      const [paymentRecord] = await db
        .insert(payment)
        .values({
          externalId: externalId,
          leaseId: leaseId,
          amount: amount.toString(),
          paymentMethod: 'BANK_TRANSFER',
          xenditInvoiceId: invoice.id,
          status: 'PENDING',
        })
        .returning();

      res.status(201).json({
        success: true,
        data: {
          paymentId: paymentRecord.id,
          invoiceUrl: invoice.invoiceUrl,
          externalId: externalId,
          amount: amount,
          status: 'PENDING',
          expiredAt: invoice.expiryDate,
        },
        message: 'Payment invoice created successfully',
      });
    } catch (error) {
      console.error('Error creating booking payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment',
      });
    }
  }

  // Get available payment methods
  async getPaymentMethods(req: Request, res: Response) {
    try {
      const paymentMethods = [
        {
          id: 'va',
          name: 'Virtual Account',
          description: 'Bank Transfer via Virtual Account',
          icon: 'bank',
          banks: ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA'],
        },
        {
          id: 'credit_card',
          name: 'Credit Card',
          description: 'Visa, Mastercard, JCB',
          icon: 'credit_card',
        },
        {
          id: 'qris',
          name: 'QRIS',
          description: 'Scan QR Code to pay',
          icon: 'qr_code',
        },
        {
          id: 'ewallet',
          name: 'E-Wallet',
          description: 'OVO, DANA, LinkAja, ShopeePay',
          icon: 'wallet',
          providers: ['OVO', 'DANA', 'LINKAJA', 'SHOPEEPAY'],
        },
        {
          id: 'retail',
          name: 'Retail Outlet',
          description: 'Alfamart, Indomaret',
          icon: 'store',
          outlets: ['ALFAMART', 'INDOMARET'],
        },
      ];

      res.json({
        success: true,
        data: paymentMethods,
      });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment methods',
      });
    }
  }

  // Get payment details for mobile
  async getPaymentDetails(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const userId = req.user?.id;

      const [paymentRecord] = await db
        .select({
          id: payment.id,
          externalId: payment.externalId,
          amount: payment.amount,
          status: payment.status,
          createdAt: payment.createdAt,
          paidAt: payment.paidAt,
          xenditInvoiceId: payment.xenditInvoiceId,
          lease: {
            id: leases.id,
            propertyId: leases.propertyId,
            startDate: leases.startDate,
            endDate: leases.endDate,
          },
          property: {
            id: properties.id,
            title: properties.title,
            address: properties.address,
            city: properties.city,
            images: properties.images,
          },
        })
        .from(payment)
        .innerJoin(leases, eq(payment.leaseId, leases.id))
        .innerJoin(properties, eq(leases.propertyId, properties.id))
        .where(and(
          eq(payment.id, paymentId),
          eq(leases.tenantId, userId)
        ))
        .limit(1);

      if (!paymentRecord) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      // Get latest invoice status from Xendit
      let invoiceStatus = null;
      try {
        const invoice = await xenditClient.Invoice.getInvoiceById({
          invoiceId: paymentRecord.xenditInvoiceId,
        });
        invoiceStatus = {
          status: invoice.status,
          invoiceUrl: invoice.invoiceUrl,
          expiredAt: invoice.expiryDate,
        };
      } catch (error) {
        console.log('Error fetching invoice from Xendit:', error);
      }

      res.json({
        success: true,
        data: {
          ...paymentRecord,
          invoice: invoiceStatus,
        },
      });
    } catch (error) {
      console.error('Error fetching payment details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment details',
      });
    }
  }

  // Cancel payment
  async cancelPayment(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const userId = req.user?.id;

      // Verify payment belongs to user
      const [paymentRecord] = await db
        .select()
        .from(payment)
        .innerJoin(leases, eq(payment.leaseId, leases.id))
        .where(and(
          eq(payment.id, paymentId),
          eq(leases.tenantId, userId),
          eq(payment.status, 'PENDING')
        ))
        .limit(1);

      if (!paymentRecord) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found or cannot be cancelled',
        });
      }

      // Expire invoice in Xendit
      try {
        await xenditClient.Invoice.expireInvoice({
          invoiceId: paymentRecord.payment.xenditInvoiceId,
        });
      } catch (error) {
        console.log('Error expiring invoice in Xendit:', error);
      }

      // Update payment status
      await db
        .update(payment)
        .set({
          status: 'FAILED',
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId));

      res.json({
        success: true,
        message: 'Payment cancelled successfully',
      });
    } catch (error) {
      console.error('Error cancelling payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel payment',
      });
    }
  }
}

export default new MobilePaymentController();
