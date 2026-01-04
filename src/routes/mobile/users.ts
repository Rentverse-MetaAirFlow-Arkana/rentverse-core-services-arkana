import express from 'express';
import { auth } from '../../middleware/auth';
import usersController from '../../modules/users/users.controller';

const router = express.Router();

/**
 * @swagger
 * /api/v1/m/users/profile:
 *   get:
 *     summary: Get user profile (Mobile)
 *     tags: [Mobile - Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', auth, usersController.getProfile);

/**
 * @swagger
 * /api/v1/m/users/profile:
 *   put:
 *     summary: Update user profile (Mobile)
 *     tags: [Mobile - Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', auth, usersController.updateProfile);

/**
 * @swagger
 * /api/v1/m/users/favorites:
 *   get:
 *     summary: Get user's favorite properties (Mobile)
 *     tags: [Mobile - Users]
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
 *     responses:
 *       200:
 *         description: Favorites retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/favorites', auth, usersController.getFavorites);

/**
 * @swagger
 * /api/v1/m/users/change-password:
 *   post:
 *     summary: Change user password (Mobile)
 *     tags: [Mobile - Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password
 *       401:
 *         description: Unauthorized
 */
router.post('/change-password', auth, usersController.changePassword);

/**
 * @swagger
 * /api/v1/m/users/bookings:
 *   get:
 *     summary: Get user's bookings (Mobile)
 *     tags: [Mobile - Users]
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
 *         description: Bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/bookings', auth, usersController.getUserBookings);

export default router;
