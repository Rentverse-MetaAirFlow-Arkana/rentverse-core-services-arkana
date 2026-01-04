import { Router } from 'express';
import { auth } from '../../middleware/auth';
import BookingController from './booking.controller';

const router = Router();

// Check property availability
router.post('/check-availability', BookingController.checkAvailability);

// Create new booking
router.post('/create', auth, BookingController.createBooking);

// Process installment payment
router.post('/pay-installment', auth, BookingController.processInstallmentPayment);

// Get booking details
router.get('/:bookingId', auth, BookingController.getBookingDetails);

// Get user bookings
router.get('/', auth, BookingController.getUserBookings);

// Simulate payment success (for testing)
router.post('/simulate-payment-success', BookingController.simulatePaymentSuccess);

export default router;
