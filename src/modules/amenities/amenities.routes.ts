import express from 'express';
import { body } from 'express-validator';
import { auth, authorize } from '../../middleware/auth';
import amenitiesController from './amenities.controller';

const router = express.Router();


router.get('/', amenitiesController.getAllAmenities);
router.get('/:id', amenitiesController.getAmenityById);
router.post(
  '/',
  auth,
  authorize('ADMIN'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('category').notEmpty().withMessage('Category is required'),
  ],
  amenitiesController.createAmenity
);

router.put('/:id', auth, authorize('ADMIN'), amenitiesController.updateAmenity);
router.delete('/:id', auth, authorize('ADMIN'), amenitiesController.deleteAmenity);

export default router;
