import express from 'express';
import { body } from 'express-validator';
import { auth, authorize } from '../../middleware/auth';
import bookingsController from './bookings.controller';

const router = express.Router();

router.get('/', auth, authorize('ADMIN'), bookingsController.getAllBookings);

router.get('/my', auth, bookingsController.getUserBookings);

router.get('/:id', auth, bookingsController.getBookingById);

router.post(
  '/',
  auth,
  [
    body('propertyId').isUUID().withMessage('Property ID must be a valid UUID'),
    body('startDate').isISO8601().withMessage('Start date must be a valid date'),
    body('endDate').isISO8601().withMessage('End date must be a valid date'),
    body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
  ],
  bookingsController.createBooking
);

router.put(
  '/:id/status',
  auth,
  [
    body('status').isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).withMessage('Invalid status'),
  ],
  bookingsController.updateBookingStatus
);

router.put('/:id/cancel', auth, bookingsController.cancelBooking);

export default router;
