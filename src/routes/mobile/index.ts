import express from 'express';
import authRoutes from './auth';
import usersRoutes from './users';
import propertiesRoutes from './properties';
import bookingsRoutes from './bookings';
import propertyTypesRoutes from './propertyTypes';
import amenitiesRoutes from './amenities';
import uploadRoutes from './upload';
import predictionsRoutes from './predictions';
import reviewsRoutes from './reviews';
import propertyViewsRoutes from './propertyViews';
import newBookingsRoutes from './newBookings';
import paymentRoutes from '../../modules/payment/payment.routes';
import signatureRoutes from './signatures';
import testSignatureRoutes from './testSignature';
import landlordRegistrationRoutes from './landlordRegistration';

const router = express.Router();

// Mount mobile routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/properties', propertiesRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/property-types', propertyTypesRoutes);
router.use('/amenities', amenitiesRoutes);
router.use('/upload', uploadRoutes);
router.use('/predictions', predictionsRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/property-views', propertyViewsRoutes);
router.use('/new-bookings', newBookingsRoutes);
router.use('/payment', paymentRoutes);
router.use('/signatures', signatureRoutes);
router.use('/test', testSignatureRoutes);
router.use('/landlord-registration', landlordRegistrationRoutes);

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Rentverse Mobile API',
    version: '2.0.0',
    platform: 'mobile',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/v1/m/auth',
      users: '/api/v1/m/users',
      properties: '/api/v1/m/properties',
      bookings: '/api/v1/m/bookings',
      propertyTypes: '/api/v1/m/property-types',
      amenities: '/api/v1/m/amenities',
      upload: '/api/v1/m/upload',
      reviews: '/api/v1/m/reviews',
      propertyViews: '/api/v1/m/property-views',
      newBookings: '/api/v1/m/new-bookings',
      payment: '/api/v1/m/payment',
      signatures: '/api/v1/m/signatures',
      landlordRegistration: '/api/v1/m/landlord-registration',
    },
  });
});

export default router;
