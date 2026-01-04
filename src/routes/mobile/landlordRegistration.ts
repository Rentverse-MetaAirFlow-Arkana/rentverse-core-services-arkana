import express from 'express';
import { body } from 'express-validator';
import { auth } from '../../middleware/auth';
import landlordRegistrationController from '../../modules/landlordRegistration/landlordRegistration.controller';

const router = express.Router();

/**
 * @swagger
 * /api/v1/m/landlord-registration/register:
 *   post:
 *     summary: Register as landlord (Mobile)
 *     tags: [Mobile - Landlord Registration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - businessType
 *               - businessAddress
 *               - businessPhone
 *               - businessEmail
 *               - bankAccountName
 *               - bankAccountNumber
 *               - bankName
 *               - identityCardUrl
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: "ABC Property Management"
 *               businessType:
 *                 type: string
 *                 example: "Property Management"
 *               businessAddress:
 *                 type: string
 *                 example: "123 Business Street, Jakarta"
 *               businessPhone:
 *                 type: string
 *                 example: "+62812345678"
 *               businessEmail:
 *                 type: string
 *                 format: email
 *                 example: "business@example.com"
 *               taxId:
 *                 type: string
 *                 example: "123456789"
 *               bankAccountName:
 *                 type: string
 *                 example: "ABC Property Management"
 *               bankAccountNumber:
 *                 type: string
 *                 example: "1234567890"
 *               bankName:
 *                 type: string
 *                 example: "Bank BCA"
 *               identityCardUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://storage.com/id-card.jpg"
 *               businessLicenseUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://storage.com/license.jpg"
 *               taxDocumentUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://storage.com/tax-doc.jpg"
 *     responses:
 *       201:
 *         description: Registration submitted successfully
 *       400:
 *         description: Validation error or already has pending registration
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/register',
  auth,
  [
    body('businessName').notEmpty().withMessage('Business name is required'),
    body('businessType').notEmpty().withMessage('Business type is required'),
    body('businessAddress').notEmpty().withMessage('Business address is required'),
    body('businessPhone').notEmpty().withMessage('Business phone is required'),
    body('businessEmail').isEmail().withMessage('Valid business email is required'),
    body('bankAccountName').notEmpty().withMessage('Bank account name is required'),
    body('bankAccountNumber').notEmpty().withMessage('Bank account number is required'),
    body('bankName').notEmpty().withMessage('Bank name is required'),
  ],
  landlordRegistrationController.registerAsLandlord
);

/**
 * @swagger
 * /api/v1/m/landlord-registration/my-status:
 *   get:
 *     summary: Get my landlord registration status (Mobile)
 *     tags: [Mobile - Landlord Registration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Registration status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasRegistration:
 *                       type: boolean
 *                     registrationId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [PENDING, APPROVED, REJECTED]
 *                     businessName:
 *                       type: string
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                     approvedAt:
 *                       type: string
 *                       format: date-time
 *                     rejectedAt:
 *                       type: string
 *                       format: date-time
 *                     rejectionReason:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/my-status', auth, landlordRegistrationController.getMyRegistrationStatus);

export default router;
