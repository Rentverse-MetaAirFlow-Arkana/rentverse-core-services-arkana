import express from 'express';
import { body } from 'express-validator';
import { auth, authorize } from '../../middleware/auth';
import propertyTypesController from './propertyTypes.controller';

const router = express.Router();

router.get('/', propertyTypesController.getAllPropertyTypes);

router.get('/:id', propertyTypesController.getPropertyTypeById);

router.post(
  '/',
  auth,
  authorize('ADMIN'),
  [
    body('code').notEmpty().withMessage('Code is required'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  propertyTypesController.createPropertyType
);

router.put('/:id', auth, authorize('ADMIN'), propertyTypesController.updatePropertyType);

router.delete('/:id', auth, authorize('ADMIN'), propertyTypesController.deletePropertyType);

export default router;
