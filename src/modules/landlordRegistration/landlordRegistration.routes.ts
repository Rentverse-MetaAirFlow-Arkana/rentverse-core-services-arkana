import express from 'express';
import { body } from 'express-validator';
import { auth, authorize } from '../../middleware/auth';
import landlordRegistrationController from './landlordRegistration.controller';

const router = express.Router();

// User endpoints
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

router.get(
  '/my-status',
  auth,
  landlordRegistrationController.getMyRegistrationStatus
);

// Admin endpoints
router.get(
  '/',
  auth,
  authorize('ADMIN'),
  landlordRegistrationController.getAllRegistrations
);

router.get(
  '/:id',
  auth,
  authorize('ADMIN'),
  landlordRegistrationController.getRegistrationById
);

router.put(
  '/:id/approve',
  auth,
  authorize('ADMIN'),
  landlordRegistrationController.approveRegistration
);

router.put(
  '/:id/reject',
  auth,
  authorize('ADMIN'),
  [
    body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
  ],
  landlordRegistrationController.rejectRegistration
);

export default router;
