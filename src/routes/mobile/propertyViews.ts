import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optionalAuth';
import { propertyViewsController } from '../../modules/propertyViews/propertyViews.controller';

const router = Router();

router.get('/recently-viewed', auth, propertyViewsController.getRecentlyViewed);
router.post('/:propertyId/view', optionalAuth, propertyViewsController.trackView);

export default router;
