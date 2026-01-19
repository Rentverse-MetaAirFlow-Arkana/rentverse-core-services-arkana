import express from 'express';
import { body } from 'express-validator';
import { auth, authorize } from '../../middleware/auth';
import propertiesController from './properties.controller';

const router = express.Router();

router.get('/', propertiesController.getAllProperties);

router.get('/:id', propertiesController.getPropertyById);

router.post(
  '/',
  auth,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('state').notEmpty().withMessage('State is required'),
    body('country').notEmpty().withMessage('Country is required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('bedrooms').isInt({ min: 0 }).withMessage('Bedrooms must be a positive integer'),
    body('bathrooms').isInt({ min: 0 }).withMessage('Bathrooms must be a positive integer'),
    body('propertyTypeId').isUUID().withMessage('Property type ID must be a valid UUID'),
  ],
  propertiesController.createProperty
);

router.put('/:id', auth, propertiesController.updateProperty);

router.patch('/:id/status', 
  auth,
  [
    body('status').isIn(['PENDING_REVIEW', 'APPROVED', 'REJECTED']).withMessage('Status must be PENDING_REVIEW, APPROVED, or REJECTED')
  ],
  propertiesController.updatePropertyStatus
);

router.delete('/:id', auth, propertiesController.deleteProperty);

// Landlord endpoints
router.get('/landlord/my-properties', auth, propertiesController.getMyProperties);
router.get('/landlord/my-properties/:id', auth, propertiesController.getMyPropertyById);

export default router;