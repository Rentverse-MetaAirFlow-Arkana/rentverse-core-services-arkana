import { pgTable, uuid, varchar, text, decimal, integer, boolean, timestamp, pgEnum, json, real } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Enums matching Prisma schema
export const roleEnum = pgEnum('Role', ['USER', 'ADMIN', 'HOST', 'LANDLORD']);
export const listingStatusEnum = pgEnum('ListingStatus', ['PENDING_REVIEW', 'APPROVED', 'REJECTED']);
export const approvalStatusEnum = pgEnum('ApprovalStatus', ['PENDING', 'APPROVED', 'REJECTED']);
export const leaseStatusEnum = pgEnum('LeaseStatus', ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED']);
export const invoiceTypeEnum = pgEnum('InvoiceType', ['RENT', 'DEPOSIT', 'UTILITY', 'OTHER']);
export const invoiceStatusEnum = pgEnum('InvoiceStatus', ['DUE', 'PAID', 'VOID', 'REFUNDED']);
export const paymentMethodEnum = pgEnum('PaymentMethod', ['BANK_TRANSFER', 'CASH', 'EWALLET', 'CREDIT_CARD']);
export const paymentStatusEnum = pgEnum('PaymentStatus', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);
export const bookingStatusEnum = pgEnum('BookingStatus', ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED']);
export const paymentTypeEnum = pgEnum('PaymentType', ['CASH', 'ONLINE']);
export const installmentStatusEnum = pgEnum('InstallmentStatus', ['UNPAID', 'PAID', 'OVERDUE']);
export const landlordRegistrationStatusEnum = pgEnum('LandlordRegistrationStatus', ['PENDING', 'APPROVED', 'REJECTED']);

// Property Types table
export const propertyTypes = pgTable('property_types', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code').notNull().unique(),
  name: varchar('name').notNull(),
  description: text('description'),
  icon: varchar('icon'),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Amenities table
export const amenities = pgTable('amenities', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name').notNull().unique(),
  category: varchar('category'),
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email').notNull().unique(),
  firstName: varchar('firstName').default('').notNull(),
  lastName: varchar('lastName').default('').notNull(),
  name: varchar('name').notNull(), // Computed field for backward compatibility
  dateOfBirth: timestamp('dateOfBirth'),
  phone: varchar('phone'),
  profilePicture: varchar('profilePicture'),
  password: varchar('password').notNull(),
  role: roleEnum('role').default('USER').notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  verifiedAt: timestamp('verifiedAt'),
  // OAuth IDs
  googleId: varchar('googleId').unique(),
  facebookId: varchar('facebookId').unique(),
  appleId: varchar('appleId').unique(),
  githubId: varchar('githubId').unique(),
  twitterId: varchar('twitterId').unique(),
});

// Properties table
export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title').notNull(),
  description: text('description'),
  address: varchar('address').notNull(),
  city: varchar('city').notNull(),
  state: varchar('state').notNull(),
  zipCode: varchar('zipCode').notNull(),
  country: varchar('country').default('MY').notNull(),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  currencyCode: varchar('currencyCode').default('MYR').notNull(),
  bedrooms: integer('bedrooms').default(0).notNull(),
  bathrooms: integer('bathrooms').default(0).notNull(),
  areaSqm: real('areaSqm'),
  furnished: boolean('furnished').default(false).notNull(),
  isAvailable: boolean('isAvailable').default(true).notNull(),
  images: text('images').array().default([]),
  // Location info
  latitude: real('latitude'),
  longitude: real('longitude'),
  placeId: varchar('placeId'),
  // Developer info
  projectName: varchar('projectName'),
  developer: varchar('developer'),
  // System metadata
  code: varchar('code').notNull().unique(),
  status: listingStatusEnum('status').default('PENDING_REVIEW').notNull(),
  viewCount: integer('viewCount').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  // Relations
  ownerId: uuid('ownerId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  propertyTypeId: uuid('propertyTypeId').notNull().references(() => propertyTypes.id),
});

// Property Amenities junction table
export const propertyAmenities = pgTable('property_amenities', {
  propertyId: uuid('propertyId').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  amenityId: uuid('amenityId').notNull().references(() => amenities.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: { primaryKey: [table.propertyId, table.amenityId] }
}));

// Listing Approvals table
export const listingApprovals = pgTable('listing_approvals', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid('propertyId').notNull().unique().references(() => properties.id, { onDelete: 'cascade' }),
  reviewerId: uuid('reviewerId').references(() => users.id),
  status: approvalStatusEnum('status').default('PENDING').notNull(),
  notes: text('notes'),
  reviewedAt: timestamp('reviewedAt'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Leases table
export const leases = pgTable('leases', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  startDate: timestamp('startDate').notNull(),
  endDate: timestamp('endDate').notNull(),
  rentAmount: decimal('rentAmount', { precision: 12, scale: 2 }).notNull(),
  currencyCode: varchar('currencyCode').default('MYR').notNull(),
  securityDeposit: decimal('securityDeposit', { precision: 12, scale: 2 }),
  status: leaseStatusEnum('status').default('PENDING').notNull(),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  propertyId: uuid('propertyId').notNull().references(() => properties.id),
  tenantId: uuid('tenantId').notNull().references(() => users.id),
  landlordId: uuid('landlordId').notNull().references(() => users.id),
});

// payment tabel
export const payment = pgTable('payment', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar('externalId').notNull().unique(),
  leaseId: uuid('leaseId').notNull().references(() => leases.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('paymentMethod').default('BANK_TRANSFER').notNull(),
  paymentChannel: varchar('paymentChannel'),
  xenditInvoiceId: varchar('xenditInvoiceId').notNull().unique(),
  currencyCode: varchar('currencyCode').default('MYR').notNull(),
  status: paymentStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  paidAt: timestamp('paidAt'),
});

// Invoices table
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  leaseId: uuid('leaseId').notNull().references(() => leases.id, { onDelete: 'cascade' }),
  type: invoiceTypeEnum('type').default('RENT').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currencyCode: varchar('currencyCode').default('MYR').notNull(),
  dueDate: timestamp('dueDate').notNull(),
  status: invoiceStatusEnum('status').default('DUE').notNull(),
  issuedAt: timestamp('issuedAt').defaultNow().notNull(),
  paidAt: timestamp('paidAt'),
  memo: text('memo'),
});

// Payments table
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid('invoiceId').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').default('BANK_TRANSFER').notNull(),
  status: paymentStatusEnum('status').default('PENDING').notNull(),
  paidAt: timestamp('paidAt'),
  txnRef: varchar('txnRef'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  payerId: uuid('payerId').references(() => users.id),
});

// Rental Agreements table
export const rentalAgreements = pgTable('rental_agreements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  leaseId: uuid('leaseId').notNull().unique().references(() => leases.id, { onDelete: 'cascade' }),
  pdfUrl: varchar('pdfUrl'),
  publicId: varchar('publicId'),
  fileName: varchar('fileName'),
  fileSize: integer('fileSize'),
  generatedAt: timestamp('generatedAt').defaultNow().notNull(),
});

// Price Predictions table
export const pricePredictions = pgTable('price_predictions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid('propertyId').references(() => properties.id),
  inputs: json('inputs').notNull(),
  predictedPrice: decimal('predictedPrice', { precision: 12, scale: 2 }).notNull(),
  confidence: real('confidence').notNull(),
  modelVersion: varchar('modelVersion').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Property Views table
export const propertyViews = pgTable('property_views', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid('propertyId').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  userId: uuid('userId').references(() => users.id, { onDelete: 'set null' }),
  ipAddress: varchar('ipAddress'),
  userAgent: varchar('userAgent'),
  viewedAt: timestamp('viewedAt').defaultNow().notNull(),
});

// Property Ratings table
export const propertyRatings = pgTable('property_ratings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid('propertyId').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5 stars
  comment: text('comment'),
  ratedAt: timestamp('ratedAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  unique: { unique: [table.propertyId, table.userId] }
}));

// Property Favorites table
export const propertyFavorites = pgTable('property_favorites', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid('propertyId').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  favoritedAt: timestamp('favoritedAt').defaultNow().notNull(),
}, (table) => ({
  unique: { unique: [table.propertyId, table.userId] }
}));

// Bookings table - New booking system
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid('propertyId').notNull().references(() => properties.id),
  tenantId: uuid('tenantId').notNull().references(() => users.id),
  landlordId: uuid('landlordId').notNull().references(() => users.id),
  
  // Booking details
  startDate: timestamp('startDate').notNull(),
  endDate: timestamp('endDate').notNull(),
  totalAmount: decimal('totalAmount', { precision: 12, scale: 2 }).notNull(),
  securityDeposit: decimal('securityDeposit', { precision: 12, scale: 2 }),
  
  // Payment configuration
  paymentType: paymentTypeEnum('paymentType').notNull(),
  installmentCount: integer('installmentCount').default(1).notNull(),
  
  // Status
  status: bookingStatusEnum('status').default('PENDING').notNull(),
  
  // PDF contract
  contractPdfUrl: varchar('contractPdfUrl'),
  contractGeneratedAt: timestamp('contractGeneratedAt'),
  
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  confirmedAt: timestamp('confirmedAt'),
});

// Booking conflicts table
export const bookingConflicts = pgTable('booking_conflicts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid('propertyId').notNull().references(() => properties.id),
  startDate: timestamp('startDate').notNull(),
  endDate: timestamp('endDate').notNull(),
  bookingId: uuid('bookingId').references(() => bookings.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Installments table
export const installments = pgTable('installments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid('bookingId').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  
  // Installment details
  installmentNumber: integer('installmentNumber').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp('dueDate').notNull(),
  
  // Status
  status: installmentStatusEnum('status').default('UNPAID').notNull(),
  
  // Payment info
  paidAt: timestamp('paidAt'),
  paidAmount: decimal('paidAmount', { precision: 12, scale: 2 }),
  paymentMethod: paymentMethodEnum('paymentMethod'),
  
  // Xendit info
  xenditInvoiceId: varchar('xenditInvoiceId'),
  xenditExternalId: varchar('xenditExternalId'),
  
  // Email notification
  reminderSentAt: timestamp('reminderSentAt'),
  
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  unique: { unique: [table.bookingId, table.installmentNumber] }
}));

// Payment transactions table
export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  installmentId: uuid('installmentId').references(() => installments.id),
  bookingId: uuid('bookingId').notNull().references(() => bookings.id),
  
  // Transaction details
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('paymentMethod').notNull(),
  paymentType: paymentTypeEnum('paymentType').notNull(),
  
  // Xendit info
  xenditInvoiceId: varchar('xenditInvoiceId'),
  xenditExternalId: varchar('xenditExternalId'),
  
  // Status
  status: paymentStatusEnum('status').default('PENDING').notNull(),
  
  // Timestamps
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  paidAt: timestamp('paidAt'),
});

// User Signatures table
export const userSignatures = pgTable('user_signatures', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  signatureUrl: varchar('signatureUrl').notNull(),
  fileName: varchar('fileName').notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Landlord Registrations table
export const landlordRegistrations = pgTable('landlord_registrations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  businessName: varchar('businessName', { length: 255 }).notNull(),
  businessType: varchar('businessType', { length: 100 }).notNull(),
  businessAddress: text('businessAddress').notNull(),
  businessPhone: varchar('businessPhone', { length: 20 }).notNull(),
  businessEmail: varchar('businessEmail', { length: 255 }).notNull(),
  taxId: varchar('taxId', { length: 50 }),
  bankAccountName: varchar('bankAccountName', { length: 255 }).notNull(),
  bankAccountNumber: varchar('bankAccountNumber', { length: 50 }).notNull(),
  bankName: varchar('bankName', { length: 100 }).notNull(),
  identityCardUrl: text('identityCardUrl'),
  businessLicenseUrl: text('businessLicenseUrl'),
  taxDocumentUrl: text('taxDocumentUrl'),
  status: landlordRegistrationStatusEnum('status').default('PENDING').notNull(),
  rejectionReason: text('rejectionReason'),
  approvedBy: varchar('approvedBy').references(() => users.id),
  approvedAt: timestamp('approvedAt'),
  rejectedBy: varchar('rejectedBy').references(() => users.id),
  rejectedAt: timestamp('rejectedAt'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  leasesAsLandlord: many(leases, { relationName: 'LandlordLeases' }),
  leasesAsTenant: many(leases, { relationName: 'TenantLeases' }),
  bookingsAsLandlord: many(bookings, { relationName: 'LandlordBookings' }),
  bookingsAsTenant: many(bookings, { relationName: 'TenantBookings' }),
  approvals: many(listingApprovals),
  payments: many(payments),
  propertyViews: many(propertyViews),
  propertyRatings: many(propertyRatings),
  propertyFavorites: many(propertyFavorites),
  signatures: many(userSignatures),
  landlordRegistrations: many(landlordRegistrations),
}));

export const propertyTypesRelations = relations(propertyTypes, ({ many }) => ({
  properties: many(properties),
}));

export const amenitiesRelations = relations(amenities, ({ many }) => ({
  properties: many(propertyAmenities),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerId],
    references: [users.id],
  }),
  propertyType: one(propertyTypes, {
    fields: [properties.propertyTypeId],
    references: [propertyTypes.id],
  }),
  amenities: many(propertyAmenities),
  leases: many(leases),
  bookings: many(bookings),
  approvals: many(listingApprovals),
  predictions: many(pricePredictions),
  views: many(propertyViews),
  favorites: many(propertyFavorites),
  ratings: many(propertyRatings),
}));

export const propertyAmenitiesRelations = relations(propertyAmenities, ({ one }) => ({
  property: one(properties, {
    fields: [propertyAmenities.propertyId],
    references: [properties.id],
  }),
  amenity: one(amenities, {
    fields: [propertyAmenities.amenityId],
    references: [amenities.id],
  }),
}));

export const listingApprovalsRelations = relations(listingApprovals, ({ one }) => ({
  property: one(properties, {
    fields: [listingApprovals.propertyId],
    references: [properties.id],
  }),
  reviewer: one(users, {
    fields: [listingApprovals.reviewerId],
    references: [users.id],
  }),
}));

export const leasesRelations = relations(leases, ({ one, many }) => ({
  property: one(properties, {
    fields: [leases.propertyId],
    references: [properties.id],
  }),
  tenant: one(users, {
    fields: [leases.tenantId],
    references: [users.id],
    relationName: 'TenantLeases',
  }),
  landlord: one(users, {
    fields: [leases.landlordId],
    references: [users.id],
    relationName: 'LandlordLeases',
  }),
  invoices: many(invoices),
  agreement: one(rentalAgreements),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  lease: one(leases, {
    fields: [invoices.leaseId],
    references: [leases.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  payer: one(users, {
    fields: [payments.payerId],
    references: [users.id],
  }),
}));

export const rentalAgreementsRelations = relations(rentalAgreements, ({ one }) => ({
  lease: one(leases, {
    fields: [rentalAgreements.leaseId],
    references: [leases.id],
  }),
}));

export const pricePredictionsRelations = relations(pricePredictions, ({ one }) => ({
  property: one(properties, {
    fields: [pricePredictions.propertyId],
    references: [properties.id],
  }),
}));

export const propertyViewsRelations = relations(propertyViews, ({ one }) => ({
  property: one(properties, {
    fields: [propertyViews.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [propertyViews.userId],
    references: [users.id],
  }),
}));

export const propertyFavoritesRelations = relations(propertyFavorites, ({ one }) => ({
  property: one(properties, {
    fields: [propertyFavorites.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [propertyFavorites.userId],
    references: [users.id],
  }),
}));

export const propertyRatingsRelations = relations(propertyRatings, ({ one }) => ({
  property: one(properties, {
    fields: [propertyRatings.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [propertyRatings.userId],
    references: [users.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  property: one(properties, {
    fields: [bookings.propertyId],
    references: [properties.id],
  }),
  tenant: one(users, {
    fields: [bookings.tenantId],
    references: [users.id],
    relationName: 'TenantBookings',
  }),
  landlord: one(users, {
    fields: [bookings.landlordId],
    references: [users.id],
    relationName: 'LandlordBookings',
  }),
  installments: many(installments),
  transactions: many(paymentTransactions),
}));

export const installmentsRelations = relations(installments, ({ one, many }) => ({
  booking: one(bookings, {
    fields: [installments.bookingId],
    references: [bookings.id],
  }),
  transactions: many(paymentTransactions),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  booking: one(bookings, {
    fields: [paymentTransactions.bookingId],
    references: [bookings.id],
  }),
  installment: one(installments, {
    fields: [paymentTransactions.installmentId],
    references: [installments.id],
  }),
}));

export const userSignaturesRelations = relations(userSignatures, ({ one }) => ({
  user: one(users, {
    fields: [userSignatures.userId],
    references: [users.id],
  }),
}));
