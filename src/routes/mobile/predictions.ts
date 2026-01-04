import { Router } from 'express';
import { body } from 'express-validator';
import { auth } from '../../middleware/auth';
import { predictionsController } from '../../modules/predictions/predictions.controller';

const router = Router();

// Get prediction service status (Mobile)
router.get('/status', auth, predictionsController.getStatus);

// Predict property price (Mobile)
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
