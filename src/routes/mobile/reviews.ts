import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { getPropertyReviews, createPropertyReview } from '../../modules/reviews/reviews.controller';

const router = Router();

router.get('/property/:propertyId', getPropertyReviews);
router.post('/property/:propertyId', auth, createPropertyReview);

export default router;
