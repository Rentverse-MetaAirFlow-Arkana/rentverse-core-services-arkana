import { Router } from 'express';
import { auth } from '../../middleware/auth';
import BookingController from '../../modules/newBookings/booking.controller';

const router = Router();

// Check property availability
router.post('/check-availability', BookingController.checkAvailability);

// Create new booking
router.post('/create', auth, BookingController.createBooking);

// Process installment payment
router.post('/pay-installment', auth, BookingController.processInstallmentPayment);

// Simulate payment success (for testing mock payments)
router.post('/simulate-payment-success', auth, BookingController.simulatePaymentSuccess);

// Xendit webhook (no auth required)
router.post('/xendit-webhook', BookingController.handleXenditWebhook);

// Check payment status (for mobile callback)
router.get('/payment-status', auth, BookingController.checkPaymentStatus);

// Manual payment confirmation (for testing)
router.post('/confirm-payment', auth, BookingController.manualPaymentConfirmation);

// Get user installments (specific routes BEFORE dynamic routes)
router.get('/installments', auth, BookingController.getUserInstallments);

// Get unpaid installments specifically  
router.get('/unpaid-installments', auth, BookingController.getUnpaidInstallments);

// Get user bookings
router.get('/', auth, BookingController.getUserBookings);

// Get booking details (dynamic route LAST)
router.get('/:bookingId', auth, BookingController.getBookingDetails);

export default router;
