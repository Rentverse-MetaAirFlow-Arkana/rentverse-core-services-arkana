import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optionalAuth';
import { propertyViewsController } from './propertyViews.controller';

const router = Router();

// Track property view (optional auth to get userId if available)
router.post('/:propertyId/view', optionalAuth, propertyViewsController.trackView);

// Get property view stats (requires auth)
router.get('/:propertyId/stats', auth, propertyViewsController.getViewStats);

// Get recently viewed properties for authenticated user
router.get('/recently-viewed', auth, propertyViewsController.getRecentlyViewed);

export default router;
