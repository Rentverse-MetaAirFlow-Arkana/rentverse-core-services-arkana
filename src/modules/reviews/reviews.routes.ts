import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { getPropertyReviews, createPropertyReview } from './reviews.controller';

const router = Router();

// Get reviews for a property
router.get('/property/:propertyId', getPropertyReviews);

// Create or update a review for a property (requires authentication)
router.post('/property/:propertyId', auth, createPropertyReview);

export default router;
