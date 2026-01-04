import express from 'express';
import amenitiesController from '../../modules/amenities/amenities.controller';

const router = express.Router();

/**
 * @swagger
 * /api/v1/m/amenities:
 *   get:
 *     summary: Get amenities (Mobile)
 *     tags: [Mobile - Amenities]
 *     responses:
 *       200:
 *         description: Amenities retrieved successfully
 */
router.get('/', amenitiesController.getAllAmenities);

/**
 * @swagger
 * /api/v1/m/amenities/categories:
 *   get:
 *     summary: Get all amenity categories (Mobile)
 *     tags: [Mobile - Amenities]
 *     responses:
 *       200:
 *         description: Amenity categories retrieved successfully
 */
router.get('/categories', amenitiesController.getAmenityCategories);

export default router;
