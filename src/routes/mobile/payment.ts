import { Router } from 'express';
import { auth } from '../../middleware/auth';
import PaymentsController from '../../modules/payment/payment.controller';
import MobilePaymentController from '../../modules/payment/mobilePayment.controller';

const router = Router();

// Mobile-specific payment endpoints
router.post('/create-booking-payment', auth, MobilePaymentController.createBookingPayment);
router.get('/methods', MobilePaymentController.getPaymentMethods);
router.get('/details/:paymentId', auth, MobilePaymentController.getPaymentDetails);
router.post('/cancel/:paymentId', auth, MobilePaymentController.cancelPayment);

// Legacy endpoints (keep for backward compatibility)
router.post('/create-invoice', auth, PaymentsController.createInvoice);
router.get('/invoice/:externalId', auth, PaymentsController.getInvoice);
router.get('/status/:externalId', auth, PaymentsController.getStatusInvoice);

// Payment callback (webhook from Xendit)
router.post('/callback', PaymentsController.invoiceCallback);

// Get user payment history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { db } = await import('../../config/database');
    const { payment, leases, properties } = await import('../../db/schema');
    const { eq, desc } = await import('drizzle-orm');

    const payments = await db
      .select({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        externalId: payment.externalId,
        lease: {
          id: leases.id,
          propertyId: leases.propertyId,
          startDate: leases.startDate,
          endDate: leases.endDate,
        },
        property: {
          title: properties.title,
          address: properties.address,
          city: properties.city,
          images: properties.images,
        }
      })
      .from(payment)
      .innerJoin(leases, eq(payment.leaseId, leases.id))
      .innerJoin(properties, eq(leases.propertyId, properties.id))
      .where(eq(leases.tenantId, userId))
      .orderBy(desc(payment.createdAt));

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history',
    });
  }
});

// Check payment status for mobile
router.get('/check/:externalId', auth, async (req, res) => {
  try {
    const { externalId } = req.params;
    const { db } = await import('../../config/database');
    const { payment } = await import('../../db/schema');
    const { eq } = await import('drizzle-orm');

    const [paymentRecord] = await db
      .select()
      .from(payment)
      .where(eq(payment.externalId, externalId))
      .limit(1);

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    res.json({
      success: true,
      data: {
        status: paymentRecord.status,
        amount: paymentRecord.amount,
        paidAt: paymentRecord.paidAt,
        createdAt: paymentRecord.createdAt,
      },
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment status',
    });
  }
});

export default router;
