import express from 'express';
import { auth } from '../../middleware/auth';
import bookingsController from '../../modules/bookings/bookings.controller';

const router = express.Router();

/**
 * @swagger
 * /api/v1/m/bookings:
 *   get:
 *     summary: Get user bookings (Mobile)
 *     tags: [Mobile - Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, ACTIVE, COMPLETED]
 *     responses:
 *       200:
 *         description: User bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth, bookingsController.getUserBookings);

/**
 * @swagger
 * /api/v1/m/bookings/my:
 *   get:
 *     summary: Get user bookings (Mobile) - Alternative endpoint
 *     tags: [Mobile - Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, ACTIVE, COMPLETED]
 *     responses:
 *       200:
 *         description: User bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my', auth, bookingsController.getUserBookings);

/**
 * @swagger
 * /api/v1/m/bookings/{id}:
 *   get:
 *     summary: Get booking by ID (Mobile)
 *     tags: [Mobile - Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *       404:
 *         description: Booking not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', auth, bookingsController.getBookingById);

/**
 * @swagger
 * /api/v1/m/bookings/{id}/status:
 *   put:
 *     summary: Update booking status (Mobile)
 *     tags: [Mobile - Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED, ACTIVE, COMPLETED]
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       404:
 *         description: Booking not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id/status', auth, bookingsController.updateBookingStatus);

/**
 * @swagger
 * /api/v1/m/bookings:
 *   post:
 *     summary: Create booking (Mobile)
 *     tags: [Mobile - Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - startDate
 *               - endDate
 *               - totalAmount
 *             properties:
 *               propertyId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               totalAmount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, bookingsController.createBooking);

export default router;
