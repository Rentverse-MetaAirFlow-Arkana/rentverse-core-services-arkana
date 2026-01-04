import express from 'express';
import { body } from 'express-validator';
import { auth } from '../../middleware/auth';
import usersController from '../../modules/users/users.controller';

const router = express.Router();

/**
 * @swagger
 * /api/v1/m/auth/register:
 *   post:
 *     summary: Mobile user registration
 *     tags: [Mobile - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
  ],
  usersController.register
);

/**
 * @swagger
 * /api/v1/m/auth/login:
 *   post:
 *     summary: Mobile user login
 *     tags: [Mobile - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  usersController.login
);

/**
 * @swagger
 * /api/v1/m/auth/me:
 *   get:
 *     summary: Get current user profile (Mobile)
 *     tags: [Mobile - Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', auth, usersController.getProfile);

/**
 * @swagger
 * /api/v1/m/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token (Mobile)
 *     tags: [Mobile - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh-token', usersController.refreshToken);

/**
 * @swagger
 * /api/v1/m/auth/google:
 *   post:
 *     summary: Authenticate with Google (Mobile)
 *     tags: [Mobile - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - googleId
 *               - email
 *               - name
 *               - firstName
 *               - lastName
 *             properties:
 *               googleId:
 *                 type: string
 *                 description: Google user ID
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *                 description: Full name
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 description: Profile picture URL
 *     responses:
 *       200:
 *         description: Google authentication successful
 *       400:
 *         description: Invalid request data
 */
router.post(
  '/google',
  [
    body('googleId').notEmpty().withMessage('Google ID is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
  ],
  usersController.googleAuth
);

export default router;
