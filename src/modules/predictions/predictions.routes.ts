import { Router } from 'express';
import { body } from 'express-validator';
import { auth, authorize } from '../../middleware/auth';
import { predictionsController } from './predictions.controller';

const router = Router();

// Get prediction service status
router.get('/status', auth, predictionsController.getStatus);

// Toggle prediction service (Admin only)
router.post('/toggle', 
  auth, 
  authorize('ADMIN'),
  [
    body('enabled').isBoolean().withMessage('Field "enabled" must be a boolean value')
  ],
  predictionsController.toggleStatus
);

// Predict property price
router.post('/predict', 
  auth,
  [
    body('area').isNumeric().withMessage('Area must be a number'),
    body('bathrooms').isInt({ min: 1 }).withMessage('Bathrooms must be a positive integer'),
    body('bedrooms').isInt({ min: 1 }).withMessage('Bedrooms must be a positive integer'),
    body('furnished').isIn(['Yes', 'No']).withMessage('Furnished must be "Yes" or "No"'),
    body('location').notEmpty().withMessage('Location is required'),
    body('property_type').notEmpty().withMessage('Property type is required')
  ],
  predictionsController.predict
);

export default router;
