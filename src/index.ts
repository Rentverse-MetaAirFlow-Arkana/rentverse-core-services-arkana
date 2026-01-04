import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDB, disconnectDB } from './config/database';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import uploadRoutes from './routes/upload';
import propertiesRoutes from './modules/properties/properties.routes';
import amenitiesRoutes from './modules/amenities/amenities.routes';
import propertyTypesRoutes from './modules/propertyTypes/propertyTypes.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import propertyViewsRoutes from './modules/propertyViews/propertyViews.routes';
import predictionsRoutes from './modules/predictions/predictions.routes';
import reviewsRoutes from './modules/reviews/reviews.routes';
import newBookingsRoutes from './modules/newBookings/booking.routes';
import landlordRegistrationRoutes from './modules/landlordRegistration/landlordRegistration.routes';
import mobileRoutes from './routes/mobile';

const app = express();
const PORT = process.env.PORT || 3005;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Rentverse API with TypeScript + Drizzle ORM',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await connectDB();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Connected',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: (error as Error).message,
      uptime: process.uptime(),
    });
  }
});

app.get('/cors-test', (req, res) => {
  res.json({
    message: 'CORS test successful!',
    origin: req.headers.origin,
    host: req.headers.host,
    timestamp: new Date().toISOString(),
  });
});

app.post('/cors-test', (req, res) => {
  res.json({
    message: 'CORS POST test successful!',
    body: req.body,
    origin: req.headers.origin,
    host: req.headers.host,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/properties', propertiesRoutes);
app.use('/api/v1/amenities', amenitiesRoutes);
app.use('/api/v1/property-types', propertyTypesRoutes);
app.use('/api/v1/bookings', bookingsRoutes);
app.use('/api/v1/property-views', propertyViewsRoutes);
app.use('/api/v1/predictions', predictionsRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/new-bookings', newBookingsRoutes);
app.use('/api/v1/landlord-registration', landlordRegistrationRoutes);

// Mobile API routes
app.use('/api/v1/m', mobileRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

async function startServer() {
  try {
    // Connect to database
    await connectDB();

    // Start server
    const server = app.listen(PORT, () => {
      console.log('🚀 ===================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 ===================================');
      console.log('');
      console.log('📚 API Documentation:');
      console.log(`📚   http://localhost:${PORT}/docs`);
      console.log('');
      console.log('🔗 API Base URL:');
      console.log(`🔗   http://localhost:${PORT}/api/v1`);
      console.log('');
      console.log('🎯 Available Endpoints:');
      console.log('   • Auth: /api/v1/auth');
      console.log('   • Users: /api/v1/users');
      console.log('   • Properties: /api/v1/properties');
      console.log('   • Amenities: /api/v1/amenities');
      console.log('   • Property Types: /api/v1/property-types');
      console.log('   • Bookings: /api/v1/bookings');
      console.log('   • New Bookings: /api/v1/new-bookings');
      console.log('   • Property Views: /api/v1/property-views');
      console.log('   • Predictions: /api/v1/predictions');
      console.log('   • Reviews: /api/v1/reviews');
      console.log('   • Upload: /api/v1/upload');
      console.log('   • Mobile API: /api/v1/m');
      console.log('');
      console.log('📱 Mobile Endpoints:');
      console.log('   • Mobile Auth: /api/v1/m/auth');
      console.log('   • Mobile Properties: /api/v1/m/properties');
      console.log('   • Mobile Bookings: /api/v1/m/bookings');
      console.log('   • Mobile Upload: /api/v1/m/upload');
      console.log('');
      console.log('⚠️  UNTESTED ENDPOINTS (Recently Added):');
      console.log('   • Predictions: /api/v1/predictions');
      console.log('   • Mobile Predictions: /api/v1/m/predictions');
      console.log('   • Property Views: /api/v1/property-views');
      console.log('   • Property Interactions: favorites, ratings, nearby');
      console.log('   • Enhanced Mobile Auth: refresh-token, google, me');
      console.log('   • Enhanced Mobile Users: change-password, bookings');
      console.log('   • Enhanced Mobile Upload: multiple, profile-picture');
      console.log('');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`🛑 Received ${signal}. Shutting down gracefully...`);
      
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.log('⚠️ Forcing shutdown...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
