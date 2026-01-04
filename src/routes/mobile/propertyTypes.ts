import express from 'express';
import propertyTypesController from '../../modules/propertyTypes/propertyTypes.controller';

const router = express.Router();

router.get('/', propertyTypesController.getAllPropertyTypes);

router.get('/:id', propertyTypesController.getPropertyTypeById);

export default router;
