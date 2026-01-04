import express from 'express';
import { auth } from '../../middleware/auth';
import propertiesController from '../../modules/properties/properties.controller';

const router = express.Router();
router.get('/nearby', async (req, res) => {
  const propertyInteractionsController = (
    await import('../../modules/properties/propertyInteractions.controller')
  ).default;
  return propertyInteractionsController.getNearbyProperties(req, res);
});

router.get('/', propertiesController.getAllProperties);

router.get('/:id', propertiesController.getPropertyById);

router.post('/:id/favorite', auth, async (req, res) => {
  const propertyInteractionsController = (
    await import('../../modules/properties/propertyInteractions.controller')
  ).default;
  req.params.propertyId = req.params.id;
  return propertyInteractionsController.addToFavorites(req, res);
});

router.delete('/:id/favorite', auth, async (req, res) => {
  const propertyInteractionsController = (
    await import('../../modules/properties/propertyInteractions.controller')
  ).default;
  req.params.propertyId = req.params.id;
  return propertyInteractionsController.removeFromFavorites(req, res);
});

router.post('/:id/rate', auth, async (req, res) => {
  const propertyInteractionsController = (
    await import('../../modules/properties/propertyInteractions.controller')
  ).default;
  req.params.propertyId = req.params.id;
  return propertyInteractionsController.rateProperty(req, res);
});

router.get('/nearby', async (req, res) => {
  const propertyInteractionsController = (
    await import('../../modules/properties/propertyInteractions.controller')
  ).default;
  return propertyInteractionsController.getNearbyProperties(req, res);
});

export default router;
